import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
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

  /** GET /admin/accounts — list all test accounts */
  @Get('accounts')
  listAccounts() {
    return this.adminService.listAccounts();
  }

  /** DELETE /admin/accounts/:id — hard delete a test account and all its data */
  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@Param('id') id: string) {
    return this.adminService.deleteAccount(id);
  }

  /** POST /admin/seed-account */
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

  /** POST /admin/seed-transactions */
  @Post('seed-transactions')
  @HttpCode(HttpStatus.CREATED)
  seedTransactions(
    @Body() body: { businessId: string; scenario: SeedScenario },
  ) {
    return this.adminService.seedTransactions(body.businessId, body.scenario);
  }

  /** DELETE /admin/clear-transactions */
  @Delete('clear-transactions')
  @HttpCode(HttpStatus.OK)
  clearTransactions(@Query('businessId') businessId: string) {
    return this.adminService.clearTransactions(businessId);
  }

  /** POST /admin/provision-demo/starter */
  @Post('provision-demo/starter')
  @HttpCode(HttpStatus.CREATED)
  provisionDemoStarter(@Body() body: { orgId: string; businessName: string; trialEndsAt?: string }) {
    return this.adminService.provisionDemoStarter(body);
  }

  /** POST /admin/provision-demo/pro */
  @Post('provision-demo/pro')
  @HttpCode(HttpStatus.CREATED)
  provisionDemoPro(@Body() body: { orgId: string; businessName: string; trialEndsAt?: string }) {
    return this.adminService.provisionDemoPro(body);
  }

  /** POST /admin/provision-demo/accountant */
  @Post('provision-demo/accountant')
  @HttpCode(HttpStatus.CREATED)
  provisionDemoAccountant(@Body() body: { ownerClerkUserId: string; orgId: string; firmName: string; firmSubdomain: string; trialEndsAt?: string }) {
    return this.adminService.provisionDemoAccountant(body);
  }

  /** POST /admin/provision-demo/client */
  @Post('provision-demo/client')
  @HttpCode(HttpStatus.CREATED)
  provisionDemoClient(@Body() body: { orgId: string; businessName: string; mode: string; firmId: string; trialEndsAt?: string }) {
    return this.adminService.provisionDemoClient(body);
  }

  /** POST /admin/provision-demo-suite */
  @Post('provision-demo-suite')
  @HttpCode(HttpStatus.CREATED)
  provisionDemoSuite(
    @Body()
    body: {
      ownerClerkUserId: string;
      starterOrgId: string;
      starterBusinessName: string;
      proOrgId: string;
      proBusinessName: string;
      accountantOrgId: string;
      firmName: string;
      firmSubdomain: string;
      client1OrgId: string;
      client1BusinessName: string;
      client2OrgId: string;
      client2BusinessName: string;
      trialEndsAt?: string;
    },
  ) {
    return this.adminService.provisionDemoSuite(body);
  }

  /** POST /admin/backfill-cca-accounts -- one-time backfill of CCA + Fixed Assets accounts */
  @Post('backfill-cca-accounts')
  @HttpCode(HttpStatus.OK)
  backfillCcaAccounts() {
    return this.adminService.backfillCcaAccounts();
  }
}
