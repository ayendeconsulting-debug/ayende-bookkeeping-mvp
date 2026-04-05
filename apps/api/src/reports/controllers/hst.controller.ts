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

  /**
   * GET /tax/provinces
   * Returns all 13 Canadian provinces/territories ordered by province_name.
   */
  @Get('provinces')
  findAllProvinces() {
    return this.provinceConfigService.findAll();
  }

  /**
   * GET /tax/provinces/:code
   * Returns the provincial tax config for a single province code.
   */
  @Get('provinces/:code')
  findProvinceByCode(@Param('code') code: string) {
    return this.provinceConfigService.findByCode(code);
  }

  // ── HST Period endpoints ──────────────────────────────────────────────────

  /**
   * POST /tax/hst/periods
   */
  @Roles('admin')
  @Post('hst/periods')
  createPeriod(@Req() req: Request, @Body() dto: CreateHSTPeriodDto) {
    return this.hstPeriodService.create(req.user!.businessId, dto);
  }

  /**
   * GET /tax/hst/periods
   */
  @Get('hst/periods')
  findAllPeriods(@Req() req: Request) {
    return this.hstPeriodService.findAll(req.user!.businessId);
  }

  /**
   * GET /tax/hst/periods/:id
   */
  @Get('hst/periods/:id')
  findOnePeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.findOne(req.user!.businessId, id);
  }

  /**
   * PATCH /tax/hst/periods/:id/file
   */
  @Roles('admin')
  @Patch('hst/periods/:id/file')
  filePeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.file(
      req.user!.businessId,
      id,
      req.user!.userId,
    );
  }

  /**
   * PATCH /tax/hst/periods/:id/lock
   */
  @Roles('admin')
  @Patch('hst/periods/:id/lock')
  lockPeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.lock(req.user!.businessId, id);
  }

  // ── HST Position endpoint (Step 6) ───────────────────────────────────────

  /**
   * GET /tax/hst/position
   * Returns the current HST/GST position for the business.
   * Defaults to current calendar quarter when no dates supplied.
   *
   * Query params (optional):
   *   start_date: YYYY-MM-DD
   *   end_date:   YYYY-MM-DD
   *
   * Response includes:
   *   - total_output_tax   (HST collected — Line 103)
   *   - total_itc_eligible (recoverable input tax — Line 106)
   *   - net_tax_owing      (Line 109: output - itc)
   *   - position_indicator ('owing' | 'refund' | 'nil')
   *   - unposted_transaction_count (warning if > 0)
   *   - breakdown by tax_category
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
}
