import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  Transaction,
  RemovedTransaction,
} from 'plaid';

import { PlaidItem, PlaidItemStatus } from '../../entities/plaid-item.entity';
import { PlaidAccount } from '../../entities/plaid-account.entity';
import { PlaidSyncCursor } from '../../entities/plaid-sync-cursor.entity';
import { PlaidWebhookLog, WebhookProcessingStatus } from '../../entities/plaid-webhook-log.entity';
import { RawTransaction, RawTransactionSource, RawTransactionStatus } from '../../entities/raw-transaction.entity';
import { ExchangeTokenDto } from '../dto/exchange-token.dto';
import { encryptToken, decryptToken } from './encryption.util';

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  /** In-memory JWK cache – keys are rotated rarely; cache indefinitely per kid */
  private readonly jwkCache = new Map<string, any>();

  constructor(
    @InjectRepository(PlaidItem)
    private plaidItemRepo: Repository<PlaidItem>,

    @InjectRepository(PlaidAccount)
    private plaidAccountRepo: Repository<PlaidAccount>,

    @InjectRepository(PlaidSyncCursor)
    private plaidSyncCursorRepo: Repository<PlaidSyncCursor>,

    @InjectRepository(PlaidWebhookLog)
    private webhookLogRepo: Repository<PlaidWebhookLog>,

    @InjectRepository(RawTransaction)
    private rawTransactionRepo: Repository<RawTransaction>,

    @InjectQueue('plaid-sync')
    private plaidSyncQueue: Queue,

    private dataSource: DataSource,
  ) {
    const config = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET':    process.env.PLAID_SECRET,
        },
      },
    });
    this.plaidClient = new PlaidApi(config);
  }

  // ─── LINK TOKEN ──────────────────────────────────────────────────────────

  async createLinkToken(businessId: string, userId: string): Promise<string> {
    try {
      const response = await this.plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'Tempo Bookkeeping',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us, CountryCode.Ca],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
      });
      return response.data.link_token;
    } catch (error) {
      this.logger.error('Failed to create link token', error?.response?.data);
      throw new InternalServerErrorException('Failed to create Plaid link token');
    }
  }

  // ─── TOKEN EXCHANGE ──────────────────────────────────────────────────────

  async exchangeToken(businessId: string, dto: ExchangeTokenDto): Promise<PlaidItem> {
    let exchangeResponse;
    try {
      exchangeResponse = await this.plaidClient.itemPublicTokenExchange({
        public_token: dto.public_token,
      });
    } catch (error) {
      this.logger.error('Token exchange failed', error?.response?.data);
      throw new BadRequestException('Failed to exchange Plaid token');
    }

    const { access_token, item_id } = exchangeResponse.data;

    const existing = await this.plaidItemRepo.findOne({ where: { item_id } });
    if (existing && !existing.is_deleted) {
      throw new BadRequestException('This bank account is already connected.');
    }

    const access_token_encrypted = encryptToken(access_token);

    return this.dataSource.transaction(async (manager) => {
      const plaidItem = manager.create(PlaidItem, {
        business_id: businessId,
        item_id,
        access_token_encrypted,
        institution_id:   dto.institution_id,
        institution_name: dto.institution_name,
        status: PlaidItemStatus.ACTIVE,
      });
      const savedItem = await manager.save(PlaidItem, plaidItem);

      const cursor = manager.create(PlaidSyncCursor, {
        plaid_item_id: savedItem.id,
        cursor: null,
      });
      await manager.save(PlaidSyncCursor, cursor);

      await this.fetchAndSaveAccounts(manager, savedItem, access_token);

      const job = await this.plaidSyncQueue.add(
        'sync-transactions',
        { plaidItemId: savedItem.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
      this.logger.log(`Queued initial sync for item ${item_id}, job ${job.id}`);

      return savedItem;
    });
  }

  // ─── ACCOUNTS ────────────────────────────────────────────────────────────

  private async fetchAndSaveAccounts(
    manager: any,
    plaidItem: PlaidItem,
    access_token: string,
  ): Promise<void> {
    try {
      const response = await this.plaidClient.accountsGet({ access_token });
      const accounts = response.data.accounts;

      for (const account of accounts) {
        const existing = await manager.findOne(PlaidAccount, {
          where: { account_id: account.account_id },
        });
        if (!existing) {
          const entity = manager.create(PlaidAccount, {
            plaid_item_id:     plaidItem.id,
            business_id:       plaidItem.business_id,
            account_id:        account.account_id,
            name:              account.name,
            official_name:     account.official_name,
            type:              account.type as any,
            subtype:           account.subtype,
            mask:              account.mask,
            iso_currency_code: account.balances?.iso_currency_code || 'USD',
            current_balance:   account.balances?.current   ?? null,
            available_balance: account.balances?.available ?? null,
          });
          await manager.save(PlaidAccount, entity);
        } else {
          existing.current_balance   = account.balances?.current   ?? existing.current_balance;
          existing.available_balance = account.balances?.available ?? existing.available_balance;
          await manager.save(PlaidAccount, existing);
        }
      }
    } catch (error) {
      this.logger.error('Failed to fetch accounts', error?.response?.data);
    }
  }

  async getAccountsForBusiness(businessId: string): Promise<PlaidAccount[]> {
    return this.plaidAccountRepo.find({
      where: { business_id: businessId, is_active: true },
      relations: ['plaid_item'],
    });
  }

  async getAccountsForItem(plaidItemId: string, businessId: string): Promise<PlaidAccount[]> {
    return this.plaidAccountRepo.find({
      where: { plaid_item_id: plaidItemId, business_id: businessId, is_active: true },
    });
  }

  // ─── CONNECTED ITEMS ─────────────────────────────────────────────────────

  async getItemsForBusiness(businessId: string): Promise<PlaidItem[]> {
    return this.plaidItemRepo.find({
      where: { business_id: businessId, is_deleted: false },
      relations: ['accounts'],
      order: { created_at: 'DESC' },
    });
  }

  async disconnectItem(itemId: string, businessId: string): Promise<void> {
    const plaidItem = await this.plaidItemRepo.findOne({
      where: { id: itemId, business_id: businessId, is_deleted: false },
    });
    if (!plaidItem) throw new NotFoundException('Plaid item not found');

    try {
      const access_token = decryptToken(plaidItem.access_token_encrypted);
      await this.plaidClient.itemRemove({ access_token });
    } catch (error) {
      this.logger.warn(`Failed to revoke Plaid token for item ${itemId}`, error?.response?.data);
    }

    plaidItem.is_deleted = true;
    plaidItem.deleted_at = new Date();
    plaidItem.status     = PlaidItemStatus.REVOKED;
    await this.plaidItemRepo.save(plaidItem);

    await this.plaidAccountRepo.update(
      { plaid_item_id: itemId },
      { is_active: false },
    );

    this.logger.log(`Disconnected Plaid item ${itemId} for business ${businessId}`);
  }

  // ─── WEBHOOK SIGNATURE VERIFICATION ──────────────────────────────────────

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<void> {
    const isSandbox = (process.env.PLAID_ENV || 'sandbox') === 'sandbox';

    if (!signature) {
      if (isSandbox) return;
      throw new UnauthorizedException('Missing Plaid-Verification header');
    }

    try {
      const { importJWK, jwtVerify, decodeProtectedHeader } = await import('jose');

      const header = decodeProtectedHeader(signature);
      const kid    = header.kid as string;
      const alg    = (header.alg as string) || 'ES256';

      if (!kid) throw new Error('Missing kid in JWT header');

      let jwk = this.jwkCache.get(kid);
      if (!jwk) {
        const response = await this.plaidClient.webhookVerificationKeyGet({ key_id: kid });
        jwk = response.data.key;
        this.jwkCache.set(kid, jwk);
        this.logger.debug(`Cached new Plaid JWK for kid=${kid}`);
      }

      const publicKey      = await importJWK(jwk, alg);
      const { payload }    = await jwtVerify(signature, publicKey);
      const bodyHash       = createHash('sha256').update(rawBody, 'utf8').digest('hex');
      const claimedHash    = (payload as any).request_body_sha256 as string;

      if (!claimedHash || claimedHash !== bodyHash) {
        throw new Error('request_body_sha256 mismatch – possible replay or tampering');
      }
    } catch (err: any) {
      if (err?.status === 401) throw err;
      this.logger.error('Webhook signature verification failed', err?.message);
      throw new UnauthorizedException('Invalid Plaid webhook signature');
    }
  }

  // ─── WEBHOOK HANDLING ─────────────────────────────────────────────────────

  async handleWebhook(
    payload: Record<string, any>,
    rawBody: string,
    signature: string,
  ): Promise<void> {
    await this.verifyWebhookSignature(rawBody, signature);

    const { webhook_type, webhook_code, item_id } = payload;

    const plaidItem = item_id
      ? await this.plaidItemRepo.findOne({ where: { item_id } })
      : null;

    const webhookLog = this.webhookLogRepo.create({
      item_id,
      business_id:   plaidItem?.business_id || null,
      webhook_type,
      webhook_code,
      payload,
      status: WebhookProcessingStatus.RECEIVED,
    });
    const savedLog = await this.webhookLogRepo.save(webhookLog);

    if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
      if (!plaidItem || plaidItem.is_deleted) {
        savedLog.status = WebhookProcessingStatus.IGNORED;
        await this.webhookLogRepo.save(savedLog);
        return;
      }

      const job = await this.plaidSyncQueue.add(
        'sync-transactions',
        { plaidItemId: plaidItem.id, webhookLogId: savedLog.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      savedLog.status = WebhookProcessingStatus.QUEUED;
      savedLog.job_id = String(job.id);
      await this.webhookLogRepo.save(savedLog);
      this.logger.log(`Queued sync job ${job.id} for item ${item_id}`);

    } else if (webhook_type === 'ITEM' && webhook_code === 'PENDING_EXPIRATION') {
      if (plaidItem) {
        plaidItem.status = PlaidItemStatus.PENDING_EXPIRATION;
        await this.plaidItemRepo.save(plaidItem);
      }
      savedLog.status = WebhookProcessingStatus.PROCESSED;
      await this.webhookLogRepo.save(savedLog);

    } else if (webhook_type === 'ITEM' && webhook_code === 'ERROR') {
      if (plaidItem) {
        plaidItem.status        = PlaidItemStatus.ERROR;
        plaidItem.error_code    = payload.error?.error_code;
        plaidItem.error_message = payload.error?.error_message;
        await this.plaidItemRepo.save(plaidItem);
      }
      savedLog.status = WebhookProcessingStatus.PROCESSED;
      await this.webhookLogRepo.save(savedLog);

    } else {
      savedLog.status = WebhookProcessingStatus.IGNORED;
      await this.webhookLogRepo.save(savedLog);
    }
  }

  // ─── TRANSACTION SYNC ─────────────────────────────────────────────────────

  async syncTransactions(plaidItemId: string): Promise<{ added: number; modified: number; removed: number }> {
    const plaidItem = await this.plaidItemRepo.findOne({
      where: { id: plaidItemId, is_deleted: false },
    });
    if (!plaidItem) throw new NotFoundException(`Plaid item ${plaidItemId} not found`);

    const access_token = decryptToken(plaidItem.access_token_encrypted);

    // ── Refresh account balances on every sync ────────────────────────────
    try {
      const balRes = await this.plaidClient.accountsGet({ access_token });
      for (const acct of balRes.data.accounts) {
        await this.plaidAccountRepo.update(
          { account_id: acct.account_id },
          {
            current_balance:   acct.balances?.current   ?? undefined,
            available_balance: acct.balances?.available ?? undefined,
          },
        );
      }
      this.logger.log(`Balances refreshed for item ${plaidItemId}`);
    } catch (balErr: any) {
      this.logger.warn(`Balance refresh skipped for item ${plaidItemId}: ${balErr.message}`);
    }

    const cursorRecord = await this.plaidSyncCursorRepo.findOne({ where: { plaid_item_id: plaidItemId } });
    let cursor         = cursorRecord?.cursor || undefined;
    let hasMore        = true;

    const allAdded:    Transaction[]        = [];
    const allModified: Transaction[]        = [];
    const allRemoved:  RemovedTransaction[] = [];

    while (hasMore) {
      const response = await this.plaidClient.transactionsSync({
        access_token,
        cursor,
        count: 500,
        options: { include_personal_finance_category: false },
      });

      const { added, modified, removed, next_cursor, has_more } = response.data;
      allAdded.push(...added);
      allModified.push(...modified);
      allRemoved.push(...removed);
      cursor  = next_cursor;
      hasMore = has_more;
    }

    await this.dataSource.transaction(async (manager) => {
      for (const tx of allAdded) {
        const exists = await manager.findOne(RawTransaction, {
          where: { plaid_transaction_id: tx.transaction_id },
        });
        if (exists) continue;

        // Plaid production convention for depository accounts:
        // positive = money leaving account (expense), negative = money entering (income).
        // Negate so our convention is: positive = income, negative = expense.
        const raw = manager.create(RawTransaction, {
          business_id:          plaidItem.business_id,
          transaction_date:     new Date(tx.date),
          description:          tx.name || tx.merchant_name || 'Unknown',
          amount:               -tx.amount,
          source_account_name:  tx.account_id,
          source:               RawTransactionSource.PLAID,
          plaid_transaction_id: tx.transaction_id,
          plaid_account_id:     tx.account_id,
          plaid_category:       tx.personal_finance_category?.primary || null,
          plaid_pending:        tx.pending,
          plaid_pending_transaction_id: tx.pending_transaction_id || null,
          status: RawTransactionStatus.PENDING,
        });
        await manager.save(RawTransaction, raw);
      }

      for (const tx of allModified) {
        await manager.update(
          RawTransaction,
          { plaid_transaction_id: tx.transaction_id },
          {
            description:      tx.name || tx.merchant_name || 'Unknown',
            amount:           -tx.amount,
            transaction_date: new Date(tx.date),
            plaid_pending:    tx.pending,
          },
        );
      }

      for (const tx of allRemoved) {
        await manager.update(
          RawTransaction,
          { plaid_transaction_id: tx.transaction_id },
          { status: RawTransactionStatus.IGNORED },
        );
      }

      if (cursorRecord) {
        cursorRecord.cursor             = cursor;
        cursorRecord.last_synced_at     = new Date();
        cursorRecord.last_sync_added    = allAdded.length;
        cursorRecord.last_sync_modified = allModified.length;
        cursorRecord.last_sync_removed  = allRemoved.length;
        await manager.save(PlaidSyncCursor, cursorRecord);
      }
    });

    this.logger.log(
      `Sync complete for item ${plaidItemId}: +${allAdded.length} ~${allModified.length} -${allRemoved.length}`,
    );

    return { added: allAdded.length, modified: allModified.length, removed: allRemoved.length };
  }
}
