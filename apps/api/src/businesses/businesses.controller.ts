import { Body, Controller, Get, Patch, Post, Param, Query, Req } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { BusinessesService } from './businesses.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BusinessMode } from '../entities/business.entity';
import { UpdateTaxSettingsDto } from '../reports/dto/update-tax-settings.dto';
import {
  FirmClientAccessRequest,
  AccessRequestStatus,
} from '../entities/firm-client-access-request.entity';
import { AccountantAuditLog } from '../entities/accountant-audit-log.entity';

export class ProvisionBusinessDto {
  @IsString() @IsNotEmpty() clerkOrgId: string;
  @IsString() name: string;
}

export class UpdateBusinessDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() fiscal_year_end?: string;
  @IsString() @IsOptional() currency_code?: string;
  @IsString() @IsOptional() @IsIn(['business', 'freelancer', 'personal']) mode?: BusinessMode;
  @IsString() @IsOptional() @IsIn(['CA', 'US']) country?: string;
  @IsOptional() settings?: Record<string, any>;
}

export class UpdatePushTokenDto {
  @IsString() @IsOptional() token?: string | null;
}

export class SeedAccountsDto {
  @IsString()
  @IsIn(['general', 'retail', 'services', 'construction', 'restaurant', 'freelancer', 'personal'])
  industry: string;
}

export class RespondToAccessRequestDto {
  @IsString() @IsIn(['approved', 'denied']) decision: 'approved' | 'denied';
  @IsString() @IsOptional() customExpiresAt?: string;
}

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
    @InjectRepository(FirmClientAccessRequest)
    private readonly accessRequestRepo: Repository<FirmClientAccessRequest>,
    @InjectRepository(AccountantAuditLog)
    private readonly auditLogRepo: Repository<AccountantAuditLog>,
  ) {}

  /**
   * POST /businesses/provision
   * Public -- idempotent, called by frontend on every page load.
   */
  @Public()
  @Post('provision')
  async provision(@Body() dto: ProvisionBusinessDto) {
    const business = await this.businessesService.provision(dto.clerkOrgId, dto.name);
    return { id: business.id, name: business.name, clerkOrgId: business.clerk_org_id };
  }

  /**
   * GET /businesses/me -- all roles
   */
  @Get('me')
  async getMe(@Req() req: Request) {
    const business = await this.businessesService.findById(req.user!.businessId);
    return {
      id: business.id,
      name: business.name,
      legal_name: business.legal_name,
      tax_id: business.tax_id,
      currency_code: business.currency_code,
      fiscal_year_end: business.fiscal_year_end,
      mode: business.mode,
      country: business.country,
      settings: business.settings,
      created_at: business.created_at,
      province_code: business.province_code,
      hst_registration_number: business.hst_registration_number,
      hst_reporting_frequency: business.hst_reporting_frequency,
    };
  }

  /**
   * PATCH /businesses/me -- admin only
   */
  @Roles('admin')
  @Patch('me')
  async updateMe(@Req() req: Request, @Body() dto: UpdateBusinessDto) {
    const business = await this.businessesService.update(req.user!.businessId, dto);
    return {
      id: business.id,
      name: business.name,
      currency_code: business.currency_code,
      fiscal_year_end: business.fiscal_year_end,
      mode: business.mode,
      country: business.country,
      settings: business.settings,
    };
  }

  /**
   * PATCH /businesses/me/push-token
   * Any authenticated user -- no role restriction.
   * Called by the mobile app on every launch after permission is granted.
   * Pass token: null to clear the token on sign-out.
   */
  @Patch('me/push-token')
  async updatePushToken(@Req() req: Request, @Body() dto: UpdatePushTokenDto) {
    await this.businessesService.updatePushToken(req.user!.businessId, dto.token ?? null);
    return { ok: true };
  }

  /**
   * PATCH /businesses/me/tax-settings -- admin only
   */
  @Roles('admin')
  @Patch('me/tax-settings')
  async updateTaxSettings(@Req() req: Request, @Body() dto: UpdateTaxSettingsDto) {
    const business = await this.businessesService.updateTaxSettings(req.user!.businessId, dto);
    return {
      id: business.id,
      province_code: business.province_code,
      hst_registration_number: business.hst_registration_number,
      hst_reporting_frequency: business.hst_reporting_frequency,
    };
  }

  /**
   * POST /businesses/seed-accounts -- admin only
   */
  @Roles('admin')
  @Post('seed-accounts')
  async seedAccounts(@Req() req: Request, @Body() dto: SeedAccountsDto) {
    return this.businessesService.seedAccounts(req.user!.businessId, dto.industry);
  }

  // -- Phase 11: Access Request endpoints (client/business-owner side) ------

  /**
   * GET /businesses/me/access-requests
   * Client views all access requests from accountant firms.
   */
  @Get('me/access-requests')
  async listAccessRequests(@Req() req: Request) {
    return this.accessRequestRepo.find({
      where: { business_id: req.user!.businessId },
      relations: ['firm'],
      order: { requested_at: 'DESC' },
    });
  }

  /**
   * PATCH /businesses/me/access-requests/:requestId/respond
   * Client approves or denies an access request.
   */
  @Roles('admin')
  @Patch('me/access-requests/:requestId/respond')
  async respondToAccessRequest(
    @Req() req: Request,
    @Param('requestId') requestId: string,
    @Body() dto: RespondToAccessRequestDto,
  ) {
    const request = await this.accessRequestRepo.findOne({
      where: { id: requestId, business_id: req.user!.businessId },
    });

    if (!request) {
      throw new Error('Access request not found.');
    }
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new Error('This request has already been responded to.');
    }

    const now = new Date();
    request.responded_at = now;

    if (dto.decision === 'approved') {
      request.status = AccessRequestStatus.APPROVED;
      if (dto.customExpiresAt) {
        request.expires_at = new Date(dto.customExpiresAt);
      } else if (request.custom_expires_at) {
        request.expires_at = request.custom_expires_at;
      } else {
        const expiry = new Date(now);
        expiry.setDate(expiry.getDate() + 90);
        request.expires_at = expiry;
      }
    } else {
      request.status = AccessRequestStatus.DENIED;
    }

    return this.accessRequestRepo.save(request);
  }

  /**
   * GET /businesses/me/accountant-activity
   * Client views audit log of accountant actions on their books.
   */
  @Get('me/accountant-activity')
  async getAccountantActivity(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.business_id = :businessId', { businessId: req.user!.businessId })
      .orderBy('log.performed_at', 'DESC')
      .take(Math.min(limit ? parseInt(limit, 10) : 50, 100))
      .skip(offset ? parseInt(offset, 10) : 0);

    if (startDate) qb.andWhere('log.performed_at >= :startDate', { startDate });
    if (endDate) qb.andWhere('log.performed_at <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
