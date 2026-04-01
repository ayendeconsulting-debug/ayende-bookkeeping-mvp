import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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
  async createAccount(
    @Req() req: Request,
    @Body() dto: CreateAccountDto,
  ) {
    dto.business_id = req.user!.businessId;
    return this.accountService.createAccount(dto);
  }

  /**
   * Seed default chart of accounts for a business
   * POST /accounts/seed
   */
  @Post('seed')
  async seedDefaultAccounts(@Req() req: Request) {
    return this.accountService.seedDefaultChartOfAccounts(req.user!.businessId);
  }

  /**
   * Get all accounts for a business
   * GET /accounts?accountType=asset&activeOnly=true
   */
  @Get()
  async getAccounts(
    @Req() req: Request,
    @Query('accountType') accountType?: AccountType,
    @Query('activeOnly') activeOnly?: string | boolean,
  ) {
    const isActiveOnly = activeOnly === true || activeOnly === 'true';
    return this.accountService.getAccounts(
      req.user!.businessId,
      accountType,
      isActiveOnly,
    );
  }

  /**
   * Get a specific account
   * GET /accounts/:id
   */
  @Get(':id')
  async getAccount(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.accountService.getAccount(id, req.user!.businessId);
  }

  /**
   * Update an account
   * PATCH /accounts/:id
   */
  @Patch(':id')
  async updateAccount(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updates: Partial<CreateAccountDto>,
  ) {
    return this.accountService.updateAccount(id, req.user!.businessId, updates);
  }

  /**
   * Deactivate an account
   * PATCH /accounts/:id/deactivate
   */
  @Patch(':id/deactivate')
  async deactivateAccount(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.accountService.deactivateAccount(id, req.user!.businessId);
  }
}
