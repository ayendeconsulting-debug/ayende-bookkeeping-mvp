import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Request } from 'express';
import { BusinessesService } from './businesses.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BusinessMode } from '../entities/business.entity';
import { UpdateTaxSettingsDto } from '../reports/dto/update-tax-settings.dto';

export class ProvisionBusinessDto {
  @IsString()
  @IsNotEmpty()
  clerkOrgId: string;

  @IsString()
  name: string;
}

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  fiscal_year_end?: string;

  @IsString()
  @IsOptional()
  currency_code?: string;

  @IsString()
  @IsOptional()
  @IsIn(['business', 'freelancer', 'personal'])
  mode?: BusinessMode;

  @IsString()
  @IsOptional()
  @IsIn(['CA', 'US'])
  country?: string;

  @IsOptional()
  settings?: Record<string, any>;
}

export class SeedAccountsDto {
  @IsString()
  @IsIn(['general', 'retail', 'services', 'construction', 'restaurant', 'freelancer', 'personal'])
  industry: string;
}

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  /**
   * POST /businesses/provision
   * Public — idempotent, called by frontend on every page load.
   */
  @Public()
  @Post('provision')
  async provision(@Body() dto: ProvisionBusinessDto) {
    const business = await this.businessesService.provision(
      dto.clerkOrgId,
      dto.name,
    );
    return {
      id: business.id,
      name: business.name,
      clerkOrgId: business.clerk_org_id,
    };
  }

  /**
   * GET /businesses/me — all roles
   * Now includes Phase 9 tax settings fields.
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
      // Phase 9: Canadian tax settings
      province_code: business.province_code,
      hst_registration_number: business.hst_registration_number,
      hst_reporting_frequency: business.hst_reporting_frequency,
    };
  }

  /**
   * PATCH /businesses/me — admin only
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
   * PATCH /businesses/me/tax-settings — admin only
   * Phase 9: Sets province, HST registration number, reporting frequency.
   * Auto-seeds default tax codes on first province set.
   */
  @Roles('admin')
  @Patch('me/tax-settings')
  async updateTaxSettings(@Req() req: Request, @Body() dto: UpdateTaxSettingsDto) {
    const business = await this.businessesService.updateTaxSettings(
      req.user!.businessId,
      dto,
    );
    return {
      id: business.id,
      province_code: business.province_code,
      hst_registration_number: business.hst_registration_number,
      hst_reporting_frequency: business.hst_reporting_frequency,
    };
  }

  /**
   * POST /businesses/seed-accounts — admin only
   * Seeds chart of accounts for the business.
   * Idempotent — safe to call multiple times (skips if accounts already exist).
   */
  @Roles('admin')
  @Post('seed-accounts')
  async seedAccounts(@Req() req: Request, @Body() dto: SeedAccountsDto) {
    return this.businessesService.seedAccounts(req.user!.businessId, dto.industry);
  }
}
