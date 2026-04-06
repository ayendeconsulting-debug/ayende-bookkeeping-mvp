import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { HstReportingFrequency } from '../entities/business.entity';
import { Public } from '../auth/public.decorator';

// ── Firm DTOs ────────────────────────────────────────────────────────────────

export class CreateFirmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain may only contain lowercase letters, numbers, and hyphens.',
  })
  subdomain: string;
}

export class UpdateFirmDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain may only contain lowercase letters, numbers, and hyphens.',
  })
  subdomain?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  logo_url?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'brand_colour must be a valid hex colour (e.g. #2C4A8C).',
  })
  brand_colour?: string;
}

// ── Client DTOs ───────────────────────────────────────────────────────────────

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsIn(['sole_prop', 'corp', 'partnership'])
  businessType: 'sole_prop' | 'corp' | 'partnership';

  @IsString()
  @IsIn(['CA', 'US'])
  country: 'CA' | 'US';

  @IsString()
  @IsOptional()
  province_code?: string;

  @IsString()
  @IsOptional()
  hst_registration_number?: string;

  @IsString()
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'annual'])
  hst_reporting_frequency?: HstReportingFrequency;

  @IsString()
  @IsIn(['standard_ca', 'standard_us', 'blank'])
  seedTemplate: 'standard_ca' | 'standard_us' | 'blank';

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  @IsOptional()
  clientFirstName?: string;
}

// ── Staff DTOs ────────────────────────────────────────────────────────────────

export class InviteStaffDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;
}

export class AcceptInviteDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('firms')
export class FirmsController {
  constructor(
    private readonly firmsService: FirmsService,
    private readonly firmClientService: FirmClientService,
    private readonly firmStaffService: FirmStaffService,
  ) {}

  // ── Firm endpoints ──────────────────────────────────────────────────────────

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

  // ── Client endpoints ────────────────────────────────────────────────────────

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

  // ── Staff endpoints ─────────────────────────────────────────────────────────

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
