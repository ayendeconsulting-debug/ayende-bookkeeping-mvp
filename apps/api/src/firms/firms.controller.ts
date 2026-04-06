import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';
import { Request } from 'express';
import { FirmsService } from './firms.service';
import { Public } from '../auth/public.decorator';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class CreateFirmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  // Only lowercase letters, numbers, hyphens
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

// ── Controller ───────────────────────────────────────────────────────────────

@Controller('firms')
export class FirmsController {
  constructor(private readonly firmsService: FirmsService) {}

  /**
   * GET /firms/me
   * Returns the authenticated user's firm (as owner or staff member).
   * Returns 404 if the user has no firm.
   */
  @Get('me')
  async getMyFirm(@Req() req: Request) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmsService.getMyFirm(clerkUserId);
  }

  /**
   * POST /firms
   * Creates a new firm for the authenticated user.
   * Automatically creates a firm_owner staff row.
   * Returns 409 if the user already owns a firm or subdomain is taken.
   */
  @Post()
  async createFirm(@Req() req: Request, @Body() dto: CreateFirmDto) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmsService.createFirm(clerkUserId, dto);
  }

  /**
   * PATCH /firms/me
   * Updates firm settings. Only the firm_owner may call this.
   * Accepts: name, subdomain, logo_url, brand_colour.
   */
  @Patch('me')
  async updateFirm(@Req() req: Request, @Body() dto: UpdateFirmDto) {
    const clerkUserId = (req as any).auth?.userId;
    return this.firmsService.updateFirm(clerkUserId, dto);
  }

  /**
   * GET /firms/branding/:subdomain
   * Public endpoint — returns branding config for a given subdomain.
   * Used by Next.js middleware for white-label injection.
   * Returns null (200) if subdomain is not found — not a 404, to avoid
   * leaking subdomain existence to unauthenticated callers.
   */
  @Public()
  @Get('branding/:subdomain')
  async getBranding(@Req() req: Request) {
    const subdomain = req.params.subdomain as string;
    const branding = await this.firmsService.getBranding(subdomain);
    return branding ?? { name: null, logo_url: null, brand_colour: null };
  }
}
