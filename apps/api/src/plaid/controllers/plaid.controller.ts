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
import { Roles } from '../../auth/roles.decorator';

/**
 * PlaidController
 *
 * Write endpoints (link-token, exchange-token, disconnect) require admin role.
 * Read endpoints (items, accounts) are accessible by all authenticated users.
 * Webhook is @Public — Plaid calls it directly, secured by signature verification.
 */
@Controller('plaid')
export class PlaidController {
  private readonly logger = new Logger(PlaidController.name);

  constructor(private readonly plaidService: PlaidService) {}

  // ── LINK TOKEN — admin only ───────────────────────────────────────────────

  /**
   * POST /plaid/link-token
   * Creates a Plaid Link token for the tenant to open Plaid Link in the frontend.
   */
  @Roles('admin')
  @Post('link-token')
  async createLinkToken(@Req() req: Request) {
    const linkToken = await this.plaidService.createLinkToken(
      req.user!.businessId,
      req.user!.userId,
    );
    return { link_token: linkToken };
  }

  // ── TOKEN EXCHANGE — admin only ───────────────────────────────────────────

  /**
   * POST /plaid/exchange-token
   * Called after Plaid Link completes successfully.
   */
  @Roles('admin')
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

  // ── LIST CONNECTED BANKS — all roles ─────────────────────────────────────

  /**
   * GET /plaid/items
   * Returns all connected banks for the authenticated business.
   */
  @Get('items')
  async getItems(@Req() req: Request) {
    const items = await this.plaidService.getItemsForBusiness(req.user!.businessId);
    return items.map(({ access_token_encrypted, ...item }) => item);
  }

  // ── LIST ACCOUNTS FOR ITEM — all roles ───────────────────────────────────

  /**
   * GET /plaid/items/:id/accounts
   */
  @Get('items/:id/accounts')
  async getAccountsForItem(
    @Param('id') itemId: string,
    @Req() req: Request,
  ) {
    return this.plaidService.getAccountsForItem(itemId, req.user!.businessId);
  }

  // ── DISCONNECT BANK — admin only ──────────────────────────────────────────

  /**
   * DELETE /plaid/items/:id
   * Disconnects a bank: revokes the access_token and soft-deletes locally.
   */
  @Roles('admin')
  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  async disconnectItem(
    @Param('id') itemId: string,
    @Req() req: Request,
  ) {
    await this.plaidService.disconnectItem(itemId, req.user!.businessId);
    return { message: 'Bank account disconnected successfully' };
  }

  // ── WEBHOOK (PUBLIC) ──────────────────────────────────────────────────────

  /**
   * POST /plaid/webhook
   * Public endpoint — Plaid calls this directly.
   * @Public() bypasses both JwtAuthGuard and RolesGuard.
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
