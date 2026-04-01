import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ClassificationAiService } from '../services/classification-ai.service';
import { AnomalyService } from '../services/anomaly.service';
import { NarrativeService } from '../services/narrative.service';
import { ChatService } from '../services/chat.service';
import { AiChatDto, AiAnomalyDto } from '../dto/ai.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly classificationAiService: ClassificationAiService,
    private readonly anomalyService: AnomalyService,
    private readonly narrativeService: NarrativeService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * POST /ai/classify/:rawTransactionId
   * AI suggests account + tax code for a raw transaction.
   * Returns a suggestion — human must still confirm before posting.
   */
  @Post('classify/:rawTransactionId')
  classify(
    @Param('rawTransactionId') rawTransactionId: string,
    @Req() req: Request,
  ) {
    return this.classificationAiService.suggest(req.user!.businessId, rawTransactionId);
  }

  /**
   * POST /ai/anomalies
   * Scan posted journal entries and flag unusual patterns.
   */
  @Post('anomalies')
  detectAnomalies(
    @Req() req: Request,
    @Body() dto: AiAnomalyDto,
  ) {
    return this.anomalyService.detect(
      req.user!.businessId,
      dto.startDate,
      dto.endDate,
    );
  }

  /**
   * GET /ai/narrative/income-statement?startDate=&endDate=&businessName=
   * Returns Income Statement data + plain English narrative.
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
   * Natural language Q&A about the business's financials.
   * Stateless — client sends full message history each call.
   */
  @Post('chat')
  chat(
    @Req() req: Request,
    @Body() dto: AiChatDto,
  ) {
    dto.businessId = req.user!.businessId;
    return this.chatService.chat(dto);
  }
}
