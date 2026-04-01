import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ClassificationService } from '../services/classification.service';
import {
  ClassifyTransactionDto,
  OwnerContributionDto,
  OwnerDrawDto,
  RawTransactionFilterDto,
} from '../dto/classify-transaction.dto';
import {
  CreateClassificationRuleDto,
  UpdateClassificationRuleDto,
} from '../dto/create-classification-rule.dto';

@Controller('classification')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  // ── Raw Transactions ────────────────────────────────────────────────────

  /**
   * GET /classification/raw
   * Returns paginated raw transactions for the authenticated business.
   * Supports filtering by status, search, and date range.
   */
  @Get('raw')
  getRawTransactions(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.classificationService.getRawTransactions(
      req.user!.businessId,
      {
        status,
        search,
        startDate,
        endDate,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    );
  }

  // ── Rules ──────────────────────────────────────────────────────────────

  @Post('rules')
  createRule(
    @Req() req: Request,
    @Body() dto: CreateClassificationRuleDto,
  ) {
    dto.businessId = req.user!.businessId;
    return this.classificationService.createRule(dto);
  }

  @Get('rules')
  findAllRules(@Req() req: Request) {
    return this.classificationService.findAllRules(req.user!.businessId);
  }

  @Patch('rules/:id')
  updateRule(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateClassificationRuleDto,
  ) {
    return this.classificationService.updateRule(req.user!.businessId, id, dto);
  }

  @Delete('rules/:id')
  deactivateRule(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.classificationService.deactivateRule(req.user!.businessId, id);
  }

  // ── Classification & Posting ────────────────────────────────────────────

  @Post('classify')
  classify(
    @Req() req: Request,
    @Body() dto: ClassifyTransactionDto,
  ) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.classify(dto);
  }

  @Post('post/:id')
  postClassified(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { sourceAccountId: string },
  ) {
    return this.classificationService.postClassifiedTransaction(
      req.user!.businessId,
      id,
      body.sourceAccountId,
      req.user!.userId,
    );
  }

  // ── Owner Equity ────────────────────────────────────────────────────────

  @Post('owner-contribution')
  ownerContribution(
    @Req() req: Request,
    @Body() dto: OwnerContributionDto,
  ) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.postOwnerContribution(dto);
  }

  @Post('owner-draw')
  ownerDraw(
    @Req() req: Request,
    @Body() dto: OwnerDrawDto,
  ) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.postOwnerDraw(dto);
  }
}
