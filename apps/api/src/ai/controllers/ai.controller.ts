import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ClassificationAiService } from '../services/classification-ai.service';
import { AnomalyService } from '../services/anomaly.service';
import { NarrativeService } from '../services/narrative.service';
import { ChatService } from '../services/chat.service';
import { AiJobsService } from '../ai-jobs.service';
import { AiChatDto, AiAnomalyDto } from '../dto/ai.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly classificationAiService: ClassificationAiService,
    private readonly anomalyService: AnomalyService,
    private readonly narrativeService: NarrativeService,
    private readonly chatService: ChatService,
    private readonly aiJobsService: AiJobsService,
  ) {}

  /**
   * POST /ai/classify/:rawTransactionId
   * Enqueues an AI classification job.
   * Returns HTTP 202 + { job_id } — poll GET /ai/jobs/:id for result.
   */
  @Post('classify/:rawTransactionId')
  @HttpCode(HttpStatus.ACCEPTED)
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
   * GET /ai/jobs/:id
   * Poll for the status and result of an AI job.
   * Returns { job_id, status: queued|processing|complete|failed, result?, error? }
   */
  @Get('jobs/:id')
  getJobStatus(@Param('id') jobId: string) {
    return this.aiJobsService.getJobStatus(jobId);
  }

  /**
   * GET /ai/narrative/income-statement?startDate=&endDate=&businessName=
   * Returns Income Statement data + plain English narrative.
   * Synchronous — fast enough to not need queueing.
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
   * Returns Balance Sheet data + plain English narrative.
   * Synchronous — fast enough to not need queueing.
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
   */
  @Post('chat')
  chat(@Req() req: Request, @Body() dto: AiChatDto) {
    dto.businessId = req.user!.businessId; return this.chatService.chat(dto);
  }
}
