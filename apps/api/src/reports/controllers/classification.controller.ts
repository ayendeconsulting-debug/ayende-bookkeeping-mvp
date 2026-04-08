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
import { SplitTransactionService } from '../services/split-transaction.service';
import {
  ClassifyTransactionDto,
  OwnerContributionDto,
  OwnerDrawDto,
  BulkClassifyDto,
} from '../dto/classify-transaction.dto';
import {
  CreateClassificationRuleDto,
  UpdateClassificationRuleDto,
} from '../dto/create-classification-rule.dto';
import { LearnClassificationRuleDto } from '../dto/learn-classification-rule.dto';
import { SplitTransactionDto } from '../dto/split-transaction.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('classification')
export class ClassificationController {
  constructor(
    private readonly classificationService: ClassificationService,
    private readonly splitTransactionService: SplitTransactionService,
  ) {}

  // ── Raw Transactions – all roles ─────────────────────────────────────────

  /** GET /classification/raw – all roles */
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
    return this.classificationService.getRawTransactions(req.user!.businessId, {
      status,
      search,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /** PATCH /classification/raw/:id/tag – admin only */
  @Roles('admin')
  @Patch('raw/:id/tag')
  tagTransaction(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { is_personal: boolean },
  ) {
    return this.classificationService.tagTransaction(
      req.user!.businessId,
      id,
      body.is_personal,
    );
  }

  // ── Phase 14: Split Transactions ─────────────────────────────────────────

  /**
   * PATCH /classification/raw/:id/split – admin + accountant
   * Accepts split lines, validates totals, posts journal entry, marks transaction as split.
   */
  @Roles('admin', 'accountant')
  @Patch('raw/:id/split')
  splitTransaction(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SplitTransactionDto,
  ) {
    return this.splitTransactionService.postSplitTransaction(
      req.user!.businessId,
      id,
      dto,
      req.user!.userId,
    );
  }

  /**
   * GET /classification/raw/:id/splits – all roles
   * Returns split lines for a posted split transaction.
   */
  @Get('raw/:id/splits')
  getSplitLines(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.splitTransactionService.getSplitLines(
      req.user!.businessId,
      id,
    );
  }

  // ── Rules ─────────────────────────────────────────────────────────────────

  /** POST /classification/rules – admin only */
  @Roles('admin')
  @Post('rules')
  createRule(@Req() req: Request, @Body() dto: CreateClassificationRuleDto) {
    dto.businessId = req.user!.businessId;
    return this.classificationService.createRule(dto);
  }

  /** GET /classification/rules – all roles */
  @Get('rules')
  findAllRules(@Req() req: Request) {
    return this.classificationService.findAllRules(req.user!.businessId);
  }

  /** PATCH /classification/rules/:id – admin only */
  @Roles('admin')
  @Patch('rules/:id')
  updateRule(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateClassificationRuleDto,
  ) {
    return this.classificationService.updateRule(req.user!.businessId, id, dto);
  }

  /** DELETE /classification/rules/:id – admin only */
  @Roles('admin')
  @Delete('rules/:id')
  deactivateRule(@Req() req: Request, @Param('id') id: string) {
    return this.classificationService.deactivateRule(req.user!.businessId, id);
  }

  /**
   * POST /classification/rules/learn – admin only
   * Promotes a manual classification override into a reusable keyword rule.
   */
  @Roles('admin')
  @Post('rules/learn')
  learnRule(@Req() req: Request, @Body() dto: LearnClassificationRuleDto) {
    dto.businessId = req.user!.businessId;
    return this.classificationService.learnRule(dto);
  }

  /**
   * POST /classification/rules/run-batch – admin + accountant
   * Phase 12: Applies all active rules to all pending raw_transactions for the business.
   */
  @Roles('admin', 'accountant')
  @Post('rules/run-batch')
  runBatchRules(@Req() req: Request) {
    return this.classificationService.runBatchRules(req.user!.businessId);
  }

  // ── Classification & Posting – admin only ─────────────────────────────────

  /** POST /classification/classify – admin only */
  @Roles('admin')
  @Post('classify')
  classify(@Req() req: Request, @Body() dto: ClassifyTransactionDto) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.classify(dto);
  }

  /** POST /classification/bulk-classify – admin only */
  @Roles('admin')
  @Post('bulk-classify')
  bulkClassify(@Req() req: Request, @Body() dto: BulkClassifyDto) {
    return this.classificationService.bulkClassify(
      req.user!.businessId,
      req.user!.userId,
      dto.rawTransactionIds,
      dto.accountId,
      dto.taxCodeId,
    );
  }

  /** POST /classification/post/:id – admin only */
  @Roles('admin')
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

  // ── Owner Equity – admin only ─────────────────────────────────────────────

  /** POST /classification/owner-contribution – admin only */
  @Roles('admin')
  @Post('owner-contribution')
  ownerContribution(@Req() req: Request, @Body() dto: OwnerContributionDto) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.postOwnerContribution(dto);
  }

  /** POST /classification/owner-draw – admin only */
  @Roles('admin')
  @Post('owner-draw')
  ownerDraw(@Req() req: Request, @Body() dto: OwnerDrawDto) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.postOwnerDraw(dto);
  }
}
