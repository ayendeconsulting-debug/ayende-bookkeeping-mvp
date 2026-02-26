import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AccountService, CreateAccountDto } from '../services/account.service';
import { AccountType } from '../../entities/account.entity';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * Create a new account
   * POST /accounts
   */
  @Post()
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountService.createAccount(dto);
  }

  /**
   * Seed default chart of accounts for a business
   * POST /accounts/seed?businessId=xxx
   */
  @Post('seed')
  async seedDefaultAccounts(@Query('businessId') businessId: string) {
    return this.accountService.seedDefaultChartOfAccounts(businessId);
  }

  /**
   * Get all accounts for a business
   * GET /accounts?businessId=xxx&accountType=asset&activeOnly=true
   */
  @Get()
  async getAccounts(
    @Query('businessId') businessId: string,
    @Query('accountType') accountType?: AccountType,
    @Query('activeOnly') activeOnly?: string | boolean,
  ) {
    const isActiveOnly = activeOnly === true || activeOnly === 'true';
    return this.accountService.getAccounts(
      businessId,
      accountType,
      isActiveOnly,
    );
  }

  /**
   * Get a specific account
   * GET /accounts/:id?businessId=xxx
   */
  @Get(':id')
  async getAccount(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    return this.accountService.getAccount(id, businessId);
  }

  /**
   * Update an account
   * PATCH /accounts/:id?businessId=xxx
   */
  @Patch(':id')
  async updateAccount(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() updates: Partial<CreateAccountDto>,
  ) {
    return this.accountService.updateAccount(id, businessId, updates);
  }

  /**
   * Deactivate an account
   * PATCH /accounts/:id/deactivate?businessId=xxx
   */
  @Patch(':id/deactivate')
  async deactivateAccount(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    return this.accountService.deactivateAccount(id, businessId);
  }
}
