import { Controller, Get, Param, Query } from '@nestjs/common';
import { LedgerService } from '../services/ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * Get account balance
   * GET /ledger/accounts/:accountId/balance?businessId=xxx&asOfDate=2024-12-31
   */
  @Get('accounts/:accountId/balance')
  async getAccountBalance(
    @Param('accountId') accountId: string,
    @Query('businessId') businessId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.ledgerService.getAccountBalance(accountId, businessId, date);
  }

  /**
   * Get trial balance
   * GET /ledger/trial-balance?businessId=xxx&asOfDate=2024-12-31
   */
  @Get('trial-balance')
  async getTrialBalance(
    @Query('businessId') businessId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.ledgerService.getTrialBalance(businessId, date);
  }

  /**
   * Get general ledger for an account
   * GET /ledger/accounts/:accountId?businessId=xxx&startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('accounts/:accountId')
  async getGeneralLedger(
    @Param('accountId') accountId: string,
    @Query('businessId') businessId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.ledgerService.getGeneralLedger(
      accountId,
      businessId,
      start,
      end,
    );
  }

  /**
   * Verify accounting integrity
   * GET /ledger/verify?businessId=xxx
   */
  @Get('verify')
  async verifyAccountingIntegrity(@Query('businessId') businessId: string) {
    return this.ledgerService.verifyAccountingIntegrity(businessId);
  }
}
