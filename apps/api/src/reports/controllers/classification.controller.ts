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
import { TransferService } from '../services/transfer.service';
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
import { MarkTransferDto } from '../dto/transfer-transaction.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('classification')
export class ClassificationController {
  constructor(
    private readonly classificationService: ClassificationService,
    private readonly splitTransactionService: SplitTransactionService,
    private readonly transferService: TransferService,
  ) {}

  // â”€â”€ Raw Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * GET /classification/raw/source-accounts
   * Returns distinct source_account_name values for the business.
   * MUST be declared before GET raw/:id to avoid NestJS treating
   * 'source-accounts' as an :id parameter.
   */
  @Get('raw/source-accounts')
  getSourceAccounts(@Req() req: Request) {
    return this.classificationService.getSourceAccounts(req.user!.businessId);
  }

  @Get('raw/transaction-months')
  getTransactionMonths(@Req() req: Request) {
    return this.classificationService.getTransactionMonths(req.user!.businessId);
  }

  /** GET /classification/raw â€” all roles */
  @Get('raw')
  getRawTransactions(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sourceAccountName') sourceAccountName?: string,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.classificationService.getRawTransactions(req.user!.businessId, {
      status,
      search,
      startDate,
      endDate,
      sourceAccountName,
      month,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /** PATCH /classification/raw/:id/tag â€” admin only */
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

  // â”€â”€ Phase 14: Split Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Roles('admin', 'accountant')
  @Patch('raw/:id/split')
  splitTransaction(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SplitTransactionDto,
  ) {
    return this.splitTransactionService.postSplitTransaction(
      req.user!.businessId, id, dto, req.user!.userId,
    );
  }

  @Get('raw/:id/splits')
  getSplitLines(@Req() req: Request, @Param('id') id: string) {
    return this.splitTransactionService.getSplitLines(req.user!.businessId, id);
  }

  // â”€â”€ Phase 14: Transfer Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Roles('admin', 'accountant')
  @Patch('raw/:id/mark-transfer')
  markTransfer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: MarkTransferDto,
  ) {
    return this.transferService.markAsTransfer(
      req.user!.businessId, id, dto, req.user!.userId,
    );
  }

  // â”€â”€ Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Roles('admin')
  @Post('rules')
  createRule(@Req() req: Request, @Body() dto: CreateClassificationRuleDto) {
    dto.businessId = req.user!.businessId;
    return this.classificationService.createRule(dto);
  }

  @Get('rules')
  findAllRules(@Req() req: Request) {
    return this.classificationService.findAllRules(req.user!.businessId);
  }

  @Roles('admin')
  @Patch('rules/:id')
  updateRule(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateClassificationRuleDto,
  ) {
    return this.classificationService.updateRule(req.user!.businessId, id, dto);
  }


  @Roles('admin')
  @Delete('raw/:id/classify')
  unclassify(@Req() req: Request, @Param('id') id: string) {
    return this.classificationService.unclassify(req.user!.businessId, id);
  }
  @Roles('admin')
  @Delete('rules/:id')
  deactivateRule(@Req() req: Request, @Param('id') id: string) {
    return this.classificationService.deactivateRule(req.user!.businessId, id);
  }

  @Roles('admin')
  @Post('rules/learn')
  learnRule(@Req() req: Request, @Body() dto: LearnClassificationRuleDto) {
    dto.businessId = req.user!.businessId;
    return this.classificationService.learnRule(dto);
  }

  @Roles('admin', 'accountant')
  @Post('rules/run-batch')
  runBatchRules(@Req() req: Request) {
    return this.classificationService.runBatchRules(req.user!.businessId);
  }

  // â”€â”€ Classification & Posting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Roles('admin')
  @Post('classify')
  classify(@Req() req: Request, @Body() dto: ClassifyTransactionDto) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.classify(dto);
  }

  @Roles('admin')
  @Post('bulk-classify')
  bulkClassify(@Req() req: Request, @Body() dto: BulkClassifyDto) {
    return this.classificationService.bulkClassify(
      req.user!.businessId, req.user!.userId,
      dto.rawTransactionIds, dto.accountId, dto.taxCodeId,
    );
  }

  @Roles('admin')
  @Post('post/:id')
  postClassified(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { sourceAccountId: string },
  ) {
    return this.classificationService.postClassifiedTransaction(
      req.user!.businessId, id, body.sourceAccountId, req.user!.userId,
    );
  }

  // â”€â”€ Owner Equity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Roles('admin')
  @Post('owner-contribution')
  ownerContribution(@Req() req: Request, @Body() dto: OwnerContributionDto) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.postOwnerContribution(dto);
  }

  @Roles('admin')
  @Post('owner-draw')
  ownerDraw(@Req() req: Request, @Body() dto: OwnerDrawDto) {
    dto.businessId = req.user!.businessId;
    dto.classifiedBy = req.user!.userId;
    return this.classificationService.postOwnerDraw(dto);
  }
}
