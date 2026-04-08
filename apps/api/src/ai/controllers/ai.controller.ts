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
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassificationAiService } from '../services/classification-ai.service';
import { AnomalyService } from '../services/anomaly.service';
import { NarrativeService } from '../services/narrative.service';
import { ChatService } from '../services/chat.service';
import { AiJobsService } from '../ai-jobs.service';
import { AiUsageService } from '../services/ai-usage.service';
import { PdfJobsService } from '../../reports/pdf-jobs.service';
import { AiChatDto, AiAnomalyDto } from '../dto/ai.dto';
import { AiUsageGuard } from '../ai-usage.guard';
import { AiFeatureType } from '../decorators/ai-feature.decorator';
import { AiFeature } from '../../entities/ai-usage-log.entity';
import { Subscription } from '../../entities/subscription.entity';
import { Business } from '../../entities/business.entity';
import { YearEndReport } from '../services/year-end.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly classificationAiService: ClassificationAiService,
    private readonly anomalyService: AnomalyService,
    private readonly narrativeService: NarrativeService,
    private readonly chatService: ChatService,
    private readonly aiJobsService: AiJobsService,
    private readonly aiUsageService: AiUsageService,
    private readonly pdfJobsService: PdfJobsService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  /**
   * POST /ai/classify/:rawTransactionId
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
   */
  @Get('year-end/pdf-status/:jobId')
  getYearEndPdfStatus(@Param('jobId') jobId: string) {
    return this.pdfJobsService.getPdfJobStatus(jobId);
  }

  /**
   * GET /ai/year-end/download/:jobId
   */
  @Get('year-end/download/:jobId')
  async downloadYearEndPdf(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const pdfInfo = await this.pdfJobsService.getPdfPath(jobId);
    if (!pdfInfo) throw new NotFoundException('PDF not ready or job not found.');
    if (!fs.existsSync(pdfInfo.filePath)) throw new NotFoundException('PDF file not found on server.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfInfo.filename}"`);
    fs.createReadStream(pdfInfo.filePath).pipe(res);
  }

  /**
   * GET /ai/jobs/:id
   */
  @Get('jobs/:id')
  getJobStatus(@Param('id') jobId: string) {
    return this.aiJobsService.getJobStatus(jobId);
  }

  /**
   * GET /ai/firm-usage
   * Phase 15: Returns firm-wide AI usage for Accountant plan businesses.
   * Returns { used, cap, percentage }.
   * Returns 403 if the business is not on the Accountant plan.
   */
  @Get('firm-usage')
  async getFirmUsage(@Req() req: Request) {
    const businessId = req.user!.businessId;
    const monthStart = this.aiUsageService.getCurrentMonthStart();

    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    if (!subscription || subscription.plan !== 'accountant') {
      throw new ForbiddenException(
        'Firm-wide AI usage is only available on the Accountant plan.',
      );
    }

    const business = await this.businessRepo.findOne({
      where: { id: businessId },
      select: ['id', 'created_by_firm_id'],
    });

    if (!business?.created_by_firm_id) {
      // Accountant business not under a firm — return per-business usage
      const used = await this.aiUsageService.getBusinessUsage(businessId, monthStart);
      return { used, cap: 500, percentage: Math.min(Math.round((used / 500) * 100), 100) };
    }

    return this.aiUsageService.getFirmUsage(business.created_by_firm_id, monthStart);
  }

  /**
   * GET /ai/narrative/income-statement
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
   * GET /ai/narrative/balance-sheet
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
   */
  @Post('chat')
  chat(@Req() req: Request, @Body() dto: AiChatDto) {
    dto.businessId = req.user!.businessId;
    return this.chatService.chat(dto);
  }
}
