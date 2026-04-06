import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { ClassificationAiService } from '../services/classification-ai.service';
import { AnomalyService } from '../services/anomaly.service';
import { NarrativeService } from '../services/narrative.service';
import { ChatService } from '../services/chat.service';
import { AiJobsService } from '../ai-jobs.service';
import { PdfJobsService } from '../../reports/pdf-jobs.service';
import { AiChatDto, AiAnomalyDto } from '../dto/ai.dto';
import { AiUsageGuard } from '../ai-usage.guard';
import { AiFeatureType } from '../decorators/ai-feature.decorator';
import { AiFeature } from '../../entities/ai-usage-log.entity';
import { YearEndReport } from '../services/year-end.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly classificationAiService: ClassificationAiService,
    private readonly anomalyService: AnomalyService,
    private readonly narrativeService: NarrativeService,
    private readonly chatService: ChatService,
    private readonly aiJobsService: AiJobsService,
    private readonly pdfJobsService: PdfJobsService,
  ) {}

  /**
   * POST /ai/classify/:rawTransactionId
   * Enqueues an AI classification job.
   * Returns HTTP 202 + { job_id } — poll GET /ai/jobs/:id for result.
   */
  @Post('classify/:rawTransactionId')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageGuard)
  @AiFeatureType(AiFeature.CLASSIFY)
  async classify(
    @Param('rawTransactionId') rawTransactionId: string,
    @Req() req: Request,
  ) {
    return this.aiJobsService.enqueueClassify(
      req.user!.businessId,
      rawTransactionId,
    );
  }

  /**
   * POST /ai/anomalies
   * Enqueues an anomaly detection job.
   * Returns HTTP 202 + { job_id } — poll GET /ai/jobs/:id for result.
   */
  @Post('anomalies')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageGuard)
  @AiFeatureType(AiFeature.ANOMALY)
  async detectAnomalies(
    @Req() req: Request,
    @Body() dto: AiAnomalyDto,
  ) {
    return this.aiJobsService.enqueueAnomalies(
      req.user!.businessId,
      dto.startDate,
      dto.endDate,
    );
  }

  /**
   * POST /ai/explain/:rawTransactionId
   * Enqueues a transaction explainer job.
   * Returns HTTP 202 + { job_id } — poll GET /ai/jobs/:id for result.
   */
  @Post('explain/:rawTransactionId')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageGuard)
  @AiFeatureType(AiFeature.EXPLAINER)
  async explain(
    @Param('rawTransactionId') rawTransactionId: string,
    @Req() req: Request,
  ) {
    return this.aiJobsService.enqueueExplain(
      req.user!.businessId,
      rawTransactionId,
    );
  }

  /**
   * POST /ai/year-end
   * Enqueues a Year-End Assistant job.
   * Body: { fiscalYearEnd: 'YYYY-MM-DD' }
   * Returns HTTP 202 + { job_id } — poll GET /ai/jobs/:id for result.
   * Result contains the full YearEndReport (rendered on screen by frontend).
   */
  @Post('year-end')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageGuard)
  @AiFeatureType(AiFeature.YEAR_END)
  async yearEnd(
    @Req() req: Request,
    @Body() body: { fiscalYearEnd: string },
  ) {
    return this.aiJobsService.enqueueYearEnd(
      req.user!.businessId,
      body.fiscalYearEnd,
    );
  }

  /**
   * POST /ai/year-end/export-pdf
   * Enqueues a Year-End PDF export job.
   * Body: the YearEndReport object returned from the year-end AI job.
   * Returns HTTP 202 + { job_id } — poll GET /ai/year-end/pdf-status/:jobId.
   */
  @Post('year-end/export-pdf')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportYearEndPdf(
    @Req() req: Request,
    @Body() report: YearEndReport,
  ) {
    return this.pdfJobsService.enqueueYearEndPdf(
      req.user!.businessId,
      report,
    );
  }

  /**
   * GET /ai/year-end/pdf-status/:jobId
   * Poll for year-end PDF job status.
   * Returns { job_id, status, download_url?, filename? }
   */
  @Get('year-end/pdf-status/:jobId')
  getYearEndPdfStatus(@Param('jobId') jobId: string) {
    return this.pdfJobsService.getPdfJobStatus(jobId);
  }

  /**
   * GET /ai/year-end/download/:jobId
   * Authenticated download stream for generated year-end PDF.
   */
  @Get('year-end/download/:jobId')
  async downloadYearEndPdf(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const pdfInfo = await this.pdfJobsService.getPdfPath(jobId);
    if (!pdfInfo) {
      throw new NotFoundException('PDF not ready or job not found.');
    }
    if (!fs.existsSync(pdfInfo.filePath)) {
      throw new NotFoundException('PDF file not found on server.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdfInfo.filename}"`,
    );
    fs.createReadStream(pdfInfo.filePath).pipe(res);
  }

  /**
   * GET /ai/jobs/:id
   * Poll for the status and result of any AI job.
   */
  @Get('jobs/:id')
  getJobStatus(@Param('id') jobId: string) {
    return this.aiJobsService.getJobStatus(jobId);
  }

  /**
   * GET /ai/narrative/income-statement?startDate=&endDate=&businessName=
   */
  @Get('narrative/income-statement')
  incomeStatementNarrative(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('businessName') businessName: string = 'Your Business',
  ) {
    return this.narrativeService.incomeStatementWithNarrative(
      { businessId: req.user!.businessId, startDate, endDate },
      businessName,
    );
  }

  /**
   * GET /ai/narrative/balance-sheet?asOfDate=&businessName=
   */
  @Get('narrative/balance-sheet')
  balanceSheetNarrative(
    @Req() req: Request,
    @Query('asOfDate') asOfDate: string,
    @Query('businessName') businessName: string = 'Your Business',
  ) {
    return this.narrativeService.balanceSheetWithNarrative(
      { businessId: req.user!.businessId, asOfDate },
      businessName,
    );
  }

  /**
   * POST /ai/chat
   * Plain English bookkeeping assistant — synchronous.
   * Not guarded — chat does not count against AI usage cap.
   */
  @Post('chat')
  chat(@Req() req: Request, @Body() dto: AiChatDto) {
    dto.businessId = req.user!.businessId;
    return this.chatService.chat(dto);
  }
}
