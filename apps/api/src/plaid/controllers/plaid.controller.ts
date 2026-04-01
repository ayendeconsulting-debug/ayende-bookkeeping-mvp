import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PlaidService } from '../services/plaid.service';
import { ExchangeTokenDto } from '../dto/exchange-token.dto';

/**
 * PlaidController
 *
 * NOTE: Authentication/authorization middleware is not yet implemented
 * (as per Phase 1 handover). businessId and userId are passed as query
 * params temporarily. Replace with JWT guard when auth is added.
 *
 * The /plaid/webhook endpoint is intentionally public —
 * it is secured by Plaid signature verification inside PlaidService.
 */
@Controller('plaid')
export class PlaidController {
  private readonly logger = new Logger(PlaidController.name);

  constructor(private readonly plaidService: PlaidService) {}

  // ─── LINK TOKEN ─────────────────────────────────────────────────────────────

  /**
   * POST /plaid/link-token
   * Creates a Plaid Link token for the tenant to open Plaid Link in the frontend.
   *
   * Query params (temporary until auth is implemented):
   *   businessId: UUID of the tenant's business
   *   userId: UUID of the current user
   */
  @Post('link-token')
  async createLinkToken(
    @Query('businessId') businessId: string,
    @Query('userId') userId: string,
  ) {
    if (!businessId || !userId) {
      throw new BadRequestException('businessId and userId are required');
    }
    const linkToken = await this.plaidService.createLinkToken(businessId, userId);
    return { link_token: linkToken };
  }

  // ─── TOKEN EXCHANGE ──────────────────────────────────────────────────────────

  /**
   * POST /plaid/exchange-token
   * Called after Plaid Link completes successfully.
   * Exchanges the public_token for a permanent access_token.
   * Saves the PlaidItem and queues initial transaction sync.
   */
  @Post('exchange-token')
  @HttpCode(HttpStatus.CREATED)
  async exchangeToken(
    @Query('businessId') businessId: string,
    @Body() dto: ExchangeTokenDto,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    const plaidItem = await this.plaidService.exchangeToken(businessId, dto);
    return {
      message: 'Bank account connected successfully',
      item_id: plaidItem.item_id,
      institution_name: plaidItem.institution_name,
      status: plaidItem.status,
    };
  }

  // ─── LIST CONNECTED BANKS ───────────────────────────────────────────────────

  /**
   * GET /plaid/items
   * Returns all connected banks for a business.
   */
  @Get('items')
  async getItems(@Query('businessId') businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    const items = await this.plaidService.getItemsForBusiness(businessId);
    // Strip encrypted token from response — never expose it
    return items.map(({ access_token_encrypted, ...item }) => item);
  }

  // ─── LIST ACCOUNTS FOR ITEM ─────────────────────────────────────────────────

  /**
   * GET /plaid/items/:id/accounts
   * Returns all accounts within a specific connected bank.
   */
  @Get('items/:id/accounts')
  async getAccountsForItem(
    @Param('id') itemId: string,
    @Query('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return this.plaidService.getAccountsForItem(itemId, businessId);
  }

  // ─── DISCONNECT BANK ─────────────────────────────────────────────────────────

  /**
   * DELETE /plaid/items/:id
   * Disconnects a bank: revokes the access_token with Plaid and soft-deletes locally.
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  async disconnectItem(
    @Param('id') itemId: string,
    @Query('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    await this.plaidService.disconnectItem(itemId, businessId);
    return { message: 'Bank account disconnected successfully' };
  }

  // ─── WEBHOOK ─────────────────────────────────────────────────────────────────

  /**
   * POST /plaid/webhook
   * Public endpoint — receives real-time events from Plaid.
   * Secured by Plaid-Verification-Header signature verification.
   *
   * IMPORTANT: This route requires raw body access for signature verification.
   * Ensure bodyParser rawBody option is enabled in main.ts.
   */
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
