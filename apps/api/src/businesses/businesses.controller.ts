import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Request } from 'express';
import { BusinessesService } from './businesses.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BusinessMode } from '../entities/business.entity';

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

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  /**
   * POST /businesses/provision
   * Public endpoint — idempotent, called by frontend on every page load.
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
   * Returns the current authenticated business details including mode/country/settings.
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
    };
  }

  /**
   * PATCH /businesses/me — admin only
   * Updates business name, fiscal year end, currency, mode, country, or settings.
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
}
