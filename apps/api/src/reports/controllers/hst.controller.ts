import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProvinceConfigService } from '../services/province-config.service';
import { HstPeriodService } from '../services/hst-period.service';
import { CreateHSTPeriodDto } from '../dto/hst-period.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('tax')
export class HstController {
  constructor(
    private readonly provinceConfigService: ProvinceConfigService,
    private readonly hstPeriodService: HstPeriodService,
  ) {}

  // ── Province endpoints (Step 2 — unchanged) ───────────────────────────────

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

  // ── HST Period endpoints (Step 4) ─────────────────────────────────────────

  /**
   * POST /tax/hst/periods
   * Creates a new HST reporting period.
   * Validates no overlap with existing periods for this business.
   */
  @Roles('admin')
  @Post('hst/periods')
  createPeriod(@Req() req: Request, @Body() dto: CreateHSTPeriodDto) {
    return this.hstPeriodService.create(req.user!.businessId, dto);
  }

  /**
   * GET /tax/hst/periods
   * Lists all HST periods for the business, newest first.
   */
  @Get('hst/periods')
  findAllPeriods(@Req() req: Request) {
    return this.hstPeriodService.findAll(req.user!.businessId);
  }

  /**
   * GET /tax/hst/periods/:id
   * Returns a single HST period.
   */
  @Get('hst/periods/:id')
  findOnePeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.findOne(req.user!.businessId, id);
  }

  /**
   * PATCH /tax/hst/periods/:id/file
   * Transitions period from open → filed.
   * Rejects with 422 if unposted transactions exist in the period date range.
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
   * Transitions period from filed → locked.
   * Locked periods prevent journal entries from being posted within their date range.
   */
  @Roles('admin')
  @Patch('hst/periods/:id/lock')
  lockPeriod(@Req() req: Request, @Param('id') id: string) {
    return this.hstPeriodService.lock(req.user!.businessId, id);
  }
}
