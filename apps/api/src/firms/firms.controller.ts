import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEmail,
  Matches,
  MaxLength,
} from 'class-validator';
import { Request } from 'express';
import { FirmsService } from './firms.service';
import { FirmClientService } from './firm-client.service';
import { FirmStaffService } from './firm-staff.service';
import { AccessRequestService } from './access-request.service';
import { AuditLogService } from './audit-log.service';
import { HstReportingFrequency } from '../entities/business.entity';
import { Public } from '../auth/public.decorator';

// ── Firm DTOs ─────────────────────────────────────────────────────────────

export class CreateFirmDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Subdomain may only contain lowercase letters, numbers, and hyphens.' })
  subdomain: string;
}

export class UpdateFirmDto {
  @IsString() @IsOptional() @MaxLength(255) name?: string;
  @IsString() @IsOptional() @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Subdomain may only contain lowercase letters, numbers, and hyphens.' })
  subdomain?: string;
  @IsString() @IsOptional() @MaxLength(500) logo_url?: string;
  @IsString() @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'brand_colour must be a valid hex colour (e.g. #2C4A8C).' })
  brand_colour?: string;
}

// ── Client DTOs ───────────────────────────────────────────────────────────

export class CreateClientDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsString() @IsIn(['sole_prop', 'corp', 'partnership']) businessType: 'sole_prop' | 'corp' | 'partnership';
  @IsString() @IsIn(['CA', 'US']) country: 'CA' | 'US';
  @IsString() @IsOptional() province_code?: string;
  @IsString() @IsOptional() hst_registration_number?: string;
  @IsString() @IsOptional() @IsIn(['monthly', 'quarterly', 'annual']) hst_reporting_frequency?: HstReportingFrequency;
  @IsString() @IsIn(['standard_ca', 'standard_us', 'blank']) seedTemplate: 'standard_ca' | 'standard_us' | 'blank';
  @IsEmail() @IsOptional() clientEmail?: string;
  @IsString() @IsOptional() clientFirstName?: string;
}

// ── Access Request DTOs ───────────────────────────────────────────────────

export class CreateAccessRequestDto {
  @IsString() @IsNotEmpty() businessId: string;
  @IsString() @IsNotEmpty() @MaxLength(500) accessNote: string;
  @IsString() @IsIn(['90_days', 'year_end', 'custom']) durationType: '90_days' | 'year_end' | 'custom';
  @IsString() @IsOptional() customExpiresAt?: string;
}

export class RespondToAccessRequestDto {
  @IsString() @IsIn(['approved', 'denied']) decision: 'approved' | 'denied';
  @IsString() @IsOptional() customExpiresAt?: string;
}

// ── Staff DTOs ────────────────────────────────────────────────────────────

export class InviteStaffDto {
  @IsEmail() @IsNotEmpty() email: string;
  @IsString() @IsOptional() firstName?: string;
}

export class AcceptInviteDto {
  @IsEmail() @IsNotEmpty() email: string;
}

// ── Controller ────────────────────────────────────────────────────────────

@Controller('firms')
export class FirmsController {
  constructor(
    private readonly firmsService: FirmsService,
    private readonly firmClientService: FirmClientService,
    private readonly firmStaffService: FirmStaffService,
    private readonly accessRequestService: AccessRequestService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Firm endpoints ────────────────────────────────────────────────────────

  @Get('me')
  async getMyFirm(@Req() req: Request) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmsService.getMyFirm(clerkUserId);
  }

  @Post()
  async createFirm(@Req() req: Request, @Body() dto: CreateFirmDto) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmsService.createFirm(clerkUserId, dto);
  }

  @Patch('me')
  async updateFirm(@Req() req: Request, @Body() dto: UpdateFirmDto) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmsService.updateFirm(clerkUserId, dto);
  }

  @Public()
  @Get('branding/:subdomain')
  async getBranding(@Req() req: Request) {
    const subdomain = req.params.subdomain as string;
    const branding = await this.firmsService.getBranding(subdomain);
    return branding ?? { name: null, logo_url: null, brand_colour: null };
  }

  // ── Client endpoints ──────────────────────────────────────────────────────

  @Get('me/clients')
  async listClients(@Req() req: Request) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmClientService.listClients(clerkUserId);
  }

  @Post('me/clients')
  async createClient(@Req() req: Request, @Body() dto: CreateClientDto) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmClientService.createClient(clerkUserId, dto);
  }

  @Get('me/clients/:businessId/overview')
  async getClientOverview(
    @Req() req: Request,
    @Param('businessId') businessId: string,
  ) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmClientService.getClientOverview(clerkUserId, businessId);
  }

  @Delete('me/clients/:id')
  async archiveClient(@Req() req: Request, @Param('id') firmClientId: string) {
    const clerkUserId = (req as any).auth?.userId;
    await this.firmClientService.archiveClient(clerkUserId, firmClientId);
    return { success: true };
  }

  @Get('me/billing-summary')
  async getBillingSummary(@Req() req: Request) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmClientService.getBillingSummary(clerkUserId);
  }

  // ── Access Request endpoints ──────────────────────────────────────────────

  /**
   * POST /firms/me/clients/access-request
   * Accountant requests edit access for a client business.
   */
  @Post('me/clients/access-request')
  async createAccessRequest(
    @Req() req: Request,
    @Body() dto: CreateAccessRequestDto,
  ) {
    const clerkUserId = (req as any).auth?.userId;
    return this.accessRequestService.createRequest(clerkUserId, dto);
  }

  /**
   * GET /firms/me/clients/:businessId/access-requests
   * Accountant lists all access requests for a client.
   */
  @Get('me/clients/:businessId/access-requests')
  async listAccessRequests(
    @Req() req: Request,
    @Param('businessId') businessId: string,
  ) {
    const clerkUserId = (req as any).auth?.userId;
    return this.accessRequestService.listRequestsForClient(clerkUserId, businessId);
  }

  /**
   * DELETE /firms/me/clients/access-request/:requestId
   * Accountant self-revokes an approved access request.
   */
  @Delete('me/clients/access-request/:requestId')
  async revokeAccessRequest(
    @Req() req: Request,
    @Param('requestId') requestId: string,
  ) {
    const clerkUserId = (req as any).auth?.userId;
    await this.accessRequestService.revokeRequest(clerkUserId, requestId);
    return { success: true };
  }

  /**
   * GET /firms/me/clients/:businessId/audit-log
   * Accountant views audit log for a client.
   */
  @Get('me/clients/:businessId/audit-log')
  async getClientAuditLog(
    @Req() req: Request,
    @Param('businessId') businessId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const clerkUserId = (req as any).auth?.userId;
    const firm = await this.firmsService.getMyFirm(clerkUserId);
    return this.auditLogService.listForClient(firm.id, businessId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  // ── Staff endpoints ───────────────────────────────────────────────────────

  @Get('me/staff')
  async listStaff(@Req() req: Request) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmStaffService.listStaff(clerkUserId);
  }

  @Post('me/staff/invite')
  async inviteStaff(@Req() req: Request, @Body() dto: InviteStaffDto) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmStaffService.inviteStaff(clerkUserId, dto);
  }

  @Patch('me/staff/accept-invite')
  async acceptInvite(@Req() req: Request, @Body() dto: AcceptInviteDto) {
    const clerkUserId = (req as any).auth?.userId;
    const result = await this.firmStaffService.acceptInvite(clerkUserId, dto.email);
    return result ?? { message: 'No pending invite found for this email.' };
  }

  @Delete('me/staff/:id')
  async removeStaff(@Req() req: Request, @Param('id') staffRowId: string) {
    const clerkUserId = (req as any).auth?.userId;
    await this.firmStaffService.removeStaff(clerkUserId, staffRowId);
    return { success: true };
  }
}
