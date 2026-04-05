import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { ProvinceConfigService } from '../services/province-config.service';
import { HstPeriodService } from '../services/hst-period.service';
import { HstReportService } from '../services/hst-report.service';
import { CreateHSTPeriodDto } from '../dto/hst-period.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('tax')
export class HstController {
  constructor(
    private readonly provinceConfigService: ProvinceConfigService,
    private readonly hstPeriodService: HstPeriodService,
    private readonly hstReportService: HstReportService,
  ) {}

  // ── Province endpoints ────────────────────────────────────────────────────

  @Get('provinces')
  findAllProvinces() {
    return this.provinceConfigService.findAll();
  }

  @Get('provinces/:code')
  findProvinceByCode(@Param('code') code: string) {
    return this.provinceConfigService.findByCode(code);
  }

  // ── HST Period endpoints ──────────────────────────────────────────────────

  @Roles('admin')
  @Post('hst/periods')
  createPeriod(@Req() req: Request, @Body() dto: CreateHSTPeriodDto) {
    return this.hstPeriodService.create(req.user!.businessId, dto);
  }

  @Get('hst/periods')
  findAllPeriods(@Req() req: Request) {
    return this.hstPeriodService.findAll(req.user!.businessId);
  }

  @Get('hst/periods/:id')
  findOnePeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.findOne(req.user!.businessId, id);
  }

  @Roles('admin')
  @Patch('hst/periods/:id/file')
  filePeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.file(
      req.user!.businessId,
      id,
      req.user!.userId,
    );
  }

  @Roles('admin')
  @Patch('hst/periods/:id/lock')
  lockPeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.lock(req.user!.businessId, id);
  }

  // ── HST Position (dashboard widget) ──────────────────────────────────────

  /**
   * GET /tax/hst/position
   * Optional query: start_date, end_date (YYYY-MM-DD)
   * Defaults to current calendar quarter.
   */
  @Get('hst/position')
  getPosition(
    @Req() req: Request,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.hstReportService.getPosition(
      req.user!.businessId,
      startDate,
      endDate,
    );
  }

  // ── CRA Remittance Report (Step 7) ────────────────────────────────────────

  /**
   * GET /tax/hst/report?period_id=<uuid>&instalments_paid=<number>
   *
   * Returns GST34-aligned CRA Remittance Report for the given HST period:
   *   Line 101 — Total sales and revenue (from Income Statement)
   *   Line 103 — HST/GST collected (output tax)
   *   Line 106 — Input tax credits (ITC eligible)
   *   Line 109 — Net tax (Line 103 - Line 106)
   *   Line 111 — Instalments paid (user-supplied, default 0)
   *   Line 113 — Balance owing or refund (Line 109 - Line 111)
   *
   * Also returns full transaction-level breakdown and mandatory disclaimer.
   */
  @Get('hst/report')
  getCraReport(
    @Req() req: Request,
    @Query('period_id') periodId: string,
    @Query('instalments_paid') instalmentsPaid?: string,
  ) {
    const instalments = instalmentsPaid ? parseFloat(instalmentsPaid) : 0;
    return this.hstReportService.getCraReport(
      req.user!.businessId,
      periodId,
      instalments,
    );
  }
}
