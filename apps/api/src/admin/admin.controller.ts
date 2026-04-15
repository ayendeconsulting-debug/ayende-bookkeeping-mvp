import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard';
import { AdminService, SeedScenario } from './admin.service';
import { BusinessMode } from '../entities/business.entity';
import { SubscriptionPlan } from '../entities/subscription.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /admin/check — verify admin access */
  @Get('check')
  check() {
    return this.adminService.checkAdmin();
  }

  /**
   * POST /admin/seed-account
   * Creates or updates a Stripe-bypassed test account.
   */
  @Post('seed-account')
  @HttpCode(HttpStatus.CREATED)
  seedAccount(
    @Body()
    body: {
      businessName: string;
      clerkOrgId: string;
      mode: BusinessMode;
      plan: SubscriptionPlan;
      trialEndsAt: string;
    },
  ) {
    return this.adminService.seedAccount(body);
  }

  /**
   * POST /admin/seed-transactions
   * Populates a test account with synthetic transactions.
   */
  @Post('seed-transactions')
  @HttpCode(HttpStatus.CREATED)
  seedTransactions(
    @Body() body: { businessId: string; scenario: SeedScenario },
  ) {
    return this.adminService.seedTransactions(body.businessId, body.scenario);
  }

  /**
   * DELETE /admin/clear-transactions
   * Removes pending synthetic transactions from a test account.
   */
  @Delete('clear-transactions')
  @HttpCode(HttpStatus.OK)
  clearTransactions(@Query('businessId') businessId: string) {
    return this.adminService.clearTransactions(businessId);
  }
}
