import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { LedgerService } from '../services/ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * Get account balance
   * GET /ledger/accounts/:accountId/balance?asOfDate=2024-12-31
   */
  @Get('accounts/:accountId/balance')
  async getAccountBalance(
    @Param('accountId') accountId: string,
    @Req() req: Request,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.ledgerService.getAccountBalance(accountId, req.user!.businessId, date);
  }

  /**
   * Get trial balance
   * GET /ledger/trial-balance?asOfDate=2024-12-31
   */
  @Get('trial-balance')
  async getTrialBalance(
    @Req() req: Request,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.ledgerService.getTrialBalance(req.user!.businessId, date);
  }

  /**
   * Get general ledger for an account
   * GET /ledger/accounts/:accountId?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('accounts/:accountId')
  async getGeneralLedger(
    @Param('accountId') accountId: string,
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.ledgerService.getGeneralLedger(
      accountId,
      req.user!.businessId,
      start,
      end,
    );
  }

  /**
   * Verify accounting integrity
   * GET /ledger/verify
   */
  @Get('verify')
  async verifyAccountingIntegrity(@Req() req: Request) {
    return this.ledgerService.verifyAccountingIntegrity(req.user!.businessId);
  }
}
