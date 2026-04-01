import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PlaidService } from '../services/plaid.service';
import { ExchangeTokenDto } from '../dto/exchange-token.dto';
import { Public } from '../../auth/public.decorator';

/**
 * PlaidController
 *
 * All endpoints except /plaid/webhook are protected by the global JwtAuthGuard.
 * businessId and userId are derived from the Clerk JWT via req.user.
 *
 * /plaid/webhook is @Public — Plaid calls it directly.
 * It is secured by Plaid signature verification inside PlaidService.
 */
@Controller('plaid')
export class PlaidController {
  private readonly logger = new Logger(PlaidController.name);

  constructor(private readonly plaidService: PlaidService) {}

  // ── LINK TOKEN ──────────────────────────────────────────────────────────

  /**
   * POST /plaid/link-token
   * Creates a Plaid Link token for the tenant to open Plaid Link in the frontend.
   */
  @Post('link-token')
  async createLinkToken(@Req() req: Request) {
    const linkToken = await this.plaidService.createLinkToken(
      req.user!.businessId,
      req.user!.userId,
    );
    return { link_token: linkToken };
  }

  // ── TOKEN EXCHANGE ───────────────────────────────────────────────────────

  /**
   * POST /plaid/exchange-token
   * Called after Plaid Link completes successfully.
   * Exchanges the public_token for a permanent access_token.
   * Saves the PlaidItem and queues initial transaction sync.
   */
  @Post('exchange-token')
  @HttpCode(HttpStatus.CREATED)
  async exchangeToken(
    @Req() req: Request,
    @Body() dto: ExchangeTokenDto,
  ) {
    const plaidItem = await this.plaidService.exchangeToken(
      req.user!.businessId,
      dto,
    );
    return {
      message: 'Bank account connected successfully',
      item_id: plaidItem.item_id,
      institution_name: plaidItem.institution_name,
      status: plaidItem.status,
    };
  }

  // ── LIST CONNECTED BANKS ────────────────────────────────────────────────

  /**
   * GET /plaid/items
   * Returns all connected banks for the authenticated business.
   */
  @Get('items')
  async getItems(@Req() req: Request) {
    const items = await this.plaidService.getItemsForBusiness(req.user!.businessId);
    // Strip encrypted token from response — never expose it
    return items.map(({ access_token_encrypted, ...item }) => item);
  }

  // ── LIST ACCOUNTS FOR ITEM ───────────────────────────────────────────────

  /**
   * GET /plaid/items/:id/accounts
   * Returns all accounts within a specific connected bank.
   */
  @Get('items/:id/accounts')
  async getAccountsForItem(
    @Param('id') itemId: string,
    @Req() req: Request,
  ) {
    return this.plaidService.getAccountsForItem(itemId, req.user!.businessId);
  }

  // ── DISCONNECT BANK ──────────────────────────────────────────────────────

  /**
   * DELETE /plaid/items/:id
   * Disconnects a bank: revokes the access_token with Plaid and soft-deletes locally.
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  async disconnectItem(
    @Param('id') itemId: string,
    @Req() req: Request,
  ) {
    await this.plaidService.disconnectItem(itemId, req.user!.businessId);
    return { message: 'Bank account disconnected successfully' };
  }

  // ── WEBHOOK (PUBLIC) ─────────────────────────────────────────────────────

  /**
   * POST /plaid/webhook
   * Public endpoint — receives real-time events from Plaid.
   * Secured by Plaid-Verification-Header signature verification inside PlaidService.
   *
   * @Public() bypasses the global JwtAuthGuard for this route only.
   * rawBody must remain enabled in main.ts for signature verification.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, any>,
    @Headers('plaid-verification') plaidSignature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(payload);
    this.logger.log(
      `Webhook received: ${payload.webhook_type}/${payload.webhook_code} for item ${payload.item_id}`,
    );
    await this.plaidService.handleWebhook(payload, rawBody, plaidSignature);
    return { received: true };
  }
}
