import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { ProvinceConfigService } from '../services/province-config.service';
import { HstPeriodService } from '../services/hst-period.service';
import { HstReportService } from '../services/hst-report.service';
import { HstExportService } from '../services/hst-export.service';
import { Business } from '../../entities/business.entity';
import { CreateHSTPeriodDto } from '../dto/hst-period.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('tax')
export class HstController {
  constructor(
    private readonly provinceConfigService: ProvinceConfigService,
    private readonly hstPeriodService: HstPeriodService,
    private readonly hstReportService: HstReportService,
    private readonly hstExportService: HstExportService,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
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

  // ── HST Position ──────────────────────────────────────────────────────────

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

  // ── CRA Remittance Report ─────────────────────────────────────────────────

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

  // ── CRA Report Exports ────────────────────────────────────────────────────

  /**
   * GET /tax/hst/report/export/pdf?period_id=<uuid>&instalments_paid=<number>
   */
  @Get('hst/report/export/pdf')
  async exportCraPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Query('period_id') periodId: string,
    @Query('instalments_paid') instalmentsPaid?: string,
  ) {
    const businessId = req.user!.businessId;
    const instalments = instalmentsPaid ? parseFloat(instalmentsPaid) : 0;

    const [report, business] = await Promise.all([
      this.hstReportService.getCraReport(businessId, periodId, instalments),
      this.businessRepo.findOne({ where: { id: businessId } }),
    ]);

    const pdfBuffer = await this.hstExportService.generatePdf(
      report,
      business?.name ?? 'Unknown Business',
      business?.hst_registration_number ?? null,
    );

    const filename = `hst-report-${report.period.period_start}-to-${report.period.period_end}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  /**
   * GET /tax/hst/report/export/csv?period_id=<uuid>&instalments_paid=<number>
   */
  @Get('hst/report/export/csv')
  async exportCraCsv(
    @Req() req: Request,
    @Res() res: Response,
    @Query('period_id') periodId: string,
    @Query('instalments_paid') instalmentsPaid?: string,
  ) {
    const businessId = req.user!.businessId;
    const instalments = instalmentsPaid ? parseFloat(instalmentsPaid) : 0;

    const [report, business] = await Promise.all([
      this.hstReportService.getCraReport(businessId, periodId, instalments),
      this.businessRepo.findOne({ where: { id: businessId } }),
    ]);

    const csv = this.hstExportService.generateCsv(
      report,
      business?.name ?? 'Unknown Business',
      business?.hst_registration_number ?? null,
    );

    const filename = `hst-report-${report.period.period_start}-to-${report.period.period_end}.csv`;
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(csv);
  }
}
