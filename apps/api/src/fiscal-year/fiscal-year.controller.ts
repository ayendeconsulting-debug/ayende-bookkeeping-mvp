import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { FiscalYearLockService } from './fiscal-year-lock.service';
import { Roles } from '../auth/roles.decorator';

@Controller('fiscal-years')
export class FiscalYearController {
  constructor(private readonly fiscalYearLockService: FiscalYearLockService) {}

  /**
   * GET /fiscal-years
   * Returns all years with posted entries + lock status for the authenticated business.
   * All roles.
   */
  @Get()
  getFiscalYears(@Req() req: Request) {
    return this.fiscalYearLockService.getFiscalYears(req.user!.businessId);
  }

  /**
   * POST /fiscal-years/:year/lock
   * Locks the specified fiscal year. Owner (admin) role only.
   */
  @Roles('admin')
  @Post(':year/lock')
  lockYear(
    @Req() req: Request,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.fiscalYearLockService.lockYear(
      req.user!.businessId,
      year,
      req.user!.userId,
    );
  }

  /**
   * DELETE /fiscal-years/:year/lock
   * Unlocks the specified year. Admin-only endpoint — not exposed in the UI.
   * Support/admin use only.
   */
  @Roles('admin')
  @Delete(':year/lock')
  @HttpCode(HttpStatus.OK)
  unlockYear(
    @Req() req: Request,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.fiscalYearLockService.unlockYear(req.user!.businessId, year);
  }
}
