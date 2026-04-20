import {
  Controller, Get, Post, Patch, Param, Body, Query, Req,
  UseGuards, HttpCode, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import { Public } from '../auth/public.decorator';
import { ReferralsService } from './referrals.service';
import { verifyPartnerToken } from './partner-dashboard.helper';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ── Public: Click Tracking ────────────────────────────────────────────

  @Public()
  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  trackClick(@Body() body: { referral_code: string; metadata?: Record<string, any> }) {
    return this.referralsService.trackClick(body.referral_code, body.metadata);
  }

  // ── Authenticated: Signup Attribution ─────────────────────────────────

  @Post('attribute')
  @HttpCode(HttpStatus.OK)
  attributeSignup(@Req() req: Request, @Body() body: { referral_code: string }) {
    return this.referralsService.attributeSignup(req.user!.userId, body.referral_code);
  }

  // ── Public: Partner Dashboard ───────────────────────────────────────

  @Public()
  @Get('partner-dashboard')
  async getPartnerDashboard(@Query('token') token: string) {
    if (!token) throw new ForbiddenException('Token required');
    const email = verifyPartnerToken(token);
    if (!email) throw new ForbiddenException('Invalid or expired token');
    return this.referralsService.getPartnerDashboardData(email);
  }

  // ── Admin: Partner CRUD ───────────────────────────────────────────────

  @Get('partners')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  listPartners() { return this.referralsService.listPartners(); }

  @Post('partners')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createPartner(@Body() dto: {
    name: string; type: 'bank' | 'accountant' | 'user' | 'community';
    email: string; referral_code?: string;
    commission_type?: 'percentage' | 'flat'; commission_value?: number; notes?: string;
  }) { return this.referralsService.createPartner(dto); }

  @Get('partners/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  getPartner(@Param('id') id: string) { return this.referralsService.getPartner(id); }

  @Patch('partners/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updatePartner(@Param('id') id: string, @Body() dto: {
    commission_type?: 'percentage' | 'flat'; commission_value?: number;
    is_active?: boolean; notes?: string; email?: string;
  }) { return this.referralsService.updatePartner(id, dto); }

  @Post('partners/:id/generate-link')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @HttpCode(HttpStatus.OK)
  generateDashboardLink(@Param('id') id: string) {
    return this.referralsService.generateDashboardLink(id);
  }

  // ── Admin: Commission Management ──────────────────────────────────────

  @Get('commissions')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  listCommissions(@Query('partnerId') partnerId?: string) {
    return this.referralsService.listCommissions(partnerId);
  }

  @Post('commissions/bulk-update')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @HttpCode(HttpStatus.OK)
  bulkUpdateCommissions(@Body() body: { ids: string[]; status: 'paid' | 'voided'; paid_at?: string }) {
    return this.referralsService.bulkUpdateCommissions(body.ids, body.status, body.paid_at);
  }
}
