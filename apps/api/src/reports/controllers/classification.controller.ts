import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ClassificationService } from '../services/classification.service';
import {
  ClassifyTransactionDto,
  OwnerContributionDto,
  OwnerDrawDto,
} from '../dto/classify-transaction.dto';
import {
  CreateClassificationRuleDto,
  UpdateClassificationRuleDto,
} from '../dto/create-classification-rule.dto';

@Controller('classification')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  // ── Rules ──────────────────────────────────────────────────────────

  @Post('rules')
  createRule(@Body() dto: CreateClassificationRuleDto) {
    return this.classificationService.createRule(dto);
  }

  @Get('rules')
  findAllRules(@Query('businessId') businessId: string) {
    return this.classificationService.findAllRules(businessId);
  }

  @Patch('rules/:id')
  updateRule(
    @Query('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClassificationRuleDto,
  ) {
    return this.classificationService.updateRule(businessId, id, dto);
  }

  @Delete('rules/:id')
  deactivateRule(
    @Query('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.classificationService.deactivateRule(businessId, id);
  }

  // ── Classification & Posting ───────────────────────────────────────

  @Post('classify')
  classify(@Body() dto: ClassifyTransactionDto) {
    return this.classificationService.classify(dto);
  }

  @Post('post/:id')
  postClassified(
    @Param('id') id: string,
    @Body() body: { businessId: string; sourceAccountId: string; postedBy: string },
  ) {
    return this.classificationService.postClassifiedTransaction(
      body.businessId,
      id,
      body.sourceAccountId,
      body.postedBy,
    );
  }

  // ── Owner Equity ───────────────────────────────────────────────────

  @Post('owner-contribution')
  ownerContribution(@Body() dto: OwnerContributionDto) {
    return this.classificationService.postOwnerContribution(dto);
  }

  @Post('owner-draw')
  ownerDraw(@Body() dto: OwnerDrawDto) {
    return this.classificationService.postOwnerDraw(dto);
  }
}
