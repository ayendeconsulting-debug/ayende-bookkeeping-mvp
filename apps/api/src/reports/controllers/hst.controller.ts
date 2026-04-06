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
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { ProvinceConfigService } from '../services/province-config.service';
import { HstPeriodService } from '../services/hst-period.service';
import { HstReportService } from '../services/hst-report.service';
import { HstExportService } from '../services/hst-export.service';
import { PdfJobsService } from '../pdf-jobs.service';
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
    private readonly pdfJobsService: PdfJobsService,
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
  getHstPosition(@Req() req: Request) {
    return this.hstReportService.getPosition(req.user!.businessId);
  }

  // ── HST Report ────────────────────────────────────────────────────────────

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

  // ── PDF Export (async) ────────────────────────────────────────────────────

  /**
   * POST /tax/hst/report/export/pdf
   * Enqueues a PDF generation job.
   * Returns HTTP 202 + { job_id } — poll GET /tax/hst/report/export/pdf/jobs/:id
   *
   * Changed from GET to POST to avoid browser tab auth issues (Phase 9 known issue).
   * The frontend calls this via fetch() with the JWT, then polls for the download URL.
   */
  @Post('hst/report/export/pdf')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueuePdfExport(
    @Req() req: Request,
    @Query('period_id') periodId: string,
    @Query('instalments_paid') instalmentsPaid?: string,
  ) {
    const instalments = instalmentsPaid ? parseFloat(instalmentsPaid) : 0;
    return this.pdfJobsService.enqueuePdfExport(
      req.user!.businessId,
      periodId,
      instalments,
    );
  }

  /**
   * GET /tax/hst/report/export/pdf/jobs/:id
   * Poll for PDF job status.
   * Returns { job_id, status, download_url?, filename?, error? }
   */
  @Get('hst/report/export/pdf/jobs/:id')
  getPdfJobStatus(@Param('id') jobId: string) {
    return this.pdfJobsService.getPdfJobStatus(jobId);
  }

  /**
   * GET /tax/hst/report/download/:jobId
   * Download the generated PDF — authenticated endpoint.
   * Streams the temp file written by the PDF job processor.
   * Resolves the Phase 9 known issue where JWT was not passed to PDF download tab.
   */
  @Get('hst/report/download/:jobId')
  async downloadPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Param('jobId') jobId: string,
  ) {
    const result = await this.pdfJobsService.getPdfPath(jobId);
    if (!result) {
      throw new NotFoundException(
        'PDF not found. The job may still be processing or has expired.',
      );
    }

    const { filePath, filename } = result;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('PDF file not found on server. Please regenerate.');
    }

    const fileBuffer = fs.readFileSync(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fileBuffer.length,
    });
    res.end(fileBuffer);
  }

  // ── CSV Export (synchronous — fast, no queue needed) ─────────────────────

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
