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
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PlaidService } from '../services/plaid.service';
import { ExchangeTokenDto } from '../dto/exchange-token.dto';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';

@Controller('plaid')
export class PlaidController {
  private readonly logger = new Logger(PlaidController.name);

  constructor(private readonly plaidService: PlaidService) {}

  // ── LINK TOKEN – admin only ──────────────────────────────────────────────

  @Roles('admin')
  @Post('link-token')
  async createLinkToken(@Req() req: Request) {
    const linkToken = await this.plaidService.createLinkToken(
      req.user!.businessId,
      req.user!.userId,
    );
    return { link_token: linkToken };
  }

  // ── TOKEN EXCHANGE – admin only ──────────────────────────────────────────

  @Roles('admin')
  @Post('exchange-token')
  @HttpCode(HttpStatus.CREATED)
  async exchangeToken(@Req() req: Request, @Body() dto: ExchangeTokenDto) {
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

  // ── LIST CONNECTED BANKS – all roles ─────────────────────────────────────

  @Get('items')
  async getItems(@Req() req: Request) {
    const items = await this.plaidService.getItemsForBusiness(req.user!.businessId);
    return items.map(({ access_token_encrypted, ...item }) => item);
  }

  // ── LIST ACCOUNTS FOR ITEM – all roles ───────────────────────────────────

  @Get('items/:id/accounts')
  async getAccountsForItem(@Param('id') itemId: string, @Req() req: Request) {
    return this.plaidService.getAccountsForItem(itemId, req.user!.businessId);
  }

  // ── MANUAL SYNC – admin only ─────────────────────────────────────────────
  // Triggers an immediate transaction sync for the given Plaid item.
  // Useful after a cursor reset or to force a refresh without waiting for webhook.

  @Roles('admin')
  @Post('items/:id/sync')
  @HttpCode(HttpStatus.OK)
  async manualSync(@Param('id') itemId: string, @Req() req: Request) {
    this.logger.log(
      `Manual sync requested for item ${itemId} by user ${req.user!.userId}`,
    );
    const result = await this.plaidService.syncTransactions(itemId);
    return {
      message: 'Sync complete',
      added: result.added,
      modified: result.modified,
      removed: result.removed,
    };
  }

  // ── DISCONNECT BANK – admin only ─────────────────────────────────────────

  @Roles('admin')
  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  async disconnectItem(@Param('id') itemId: string, @Req() req: Request) {
    await this.plaidService.disconnectItem(itemId, req.user!.businessId);
    return { message: 'Bank account disconnected successfully' };
  }

  // ── WEBHOOK (PUBLIC + no rate limit) ─────────────────────────────────────

  @Public()
  @SkipThrottle()
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
