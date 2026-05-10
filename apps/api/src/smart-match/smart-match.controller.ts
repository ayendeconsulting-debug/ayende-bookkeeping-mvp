import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { SmartMatchService } from './smart-match.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  SmartMatchConfirmDto,
  SmartMatchOverrideDto,
  SmartMatchBulkConfirmDto,
  SmartMatchListQueryDto,
} from './dto/smart-match.dto';

@Controller('smart-match')
export class SmartMatchController {
  constructor(
    private readonly smartMatchService: SmartMatchService,
    @InjectQueue('smart-match-batch')
    private readonly batchQueue: Queue,
  ) {}

  /**
   * GET /smart-match/counts
   * Sub-tab badge counts: suggested, cap_exceeded, failed, manual.
   * All authenticated roles.
   */
  @Get('counts')
  getCounts(@Req() req: Request) {
    return this.smartMatchService.getCounts(req.user!.businessId);
  }

  /**
   * GET /smart-match/suggested
   * Paginated list of raw transactions in suggested state.
   * All authenticated roles.
   */
  @Get('suggested')
  getSuggested(@Req() req: Request, @Query() query: SmartMatchListQueryDto) {
    return this.smartMatchService.getSuggested(
      req.user!.businessId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  /**
   * POST /smart-match/:id/confirm
   * Accept the suggestion and classify the transaction.
   * Admin only.
   */
  @Roles('admin')
  @Post(':id/confirm')
  confirm(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SmartMatchConfirmDto,
  ) {
    return this.smartMatchService.confirm(
      req.user!.businessId,
      id,
      req.user!.userId,
      dto.sourceAccountId,
    );
  }

  /**
   * POST /smart-match/bulk-confirm
   * Accept all (or specified) suggestions in one call.
   * Admin only.
   *
   * NOTE: must be declared BEFORE :id routes to prevent Express treating
   * 'bulk-confirm' as an :id parameter.
   */
  @Roles('admin')
  @Post('bulk-confirm')
  bulkConfirm(@Req() req: Request, @Body() dto: SmartMatchBulkConfirmDto) {
    return this.smartMatchService.bulkConfirm(
      req.user!.businessId,
      req.user!.userId,
      dto,
    );
  }

  /**
   * POST /smart-match/:id/override
   * User picks a different account. Classifies and creates a user_learned rule.
   * Admin only.
   */
  @Roles('admin')
  @Post(':id/override')
  override(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SmartMatchOverrideDto,
  ) {
    return this.smartMatchService.override(
      req.user!.businessId,
      id,
      req.user!.userId,
      dto,
    );
  }

  /**
   * POST /smart-match/run
   * Manually trigger a full Smart Match sweep for the business.
   * Admin only.
   *
   * NOTE: declared after bulk-confirm but before :id routes.
   */
  @Roles('admin')
  @Post('run')
  async run(@Req() req: Request) {
    await this.batchQueue.add(
      'smart-match-batch',
      { businessId: req.user!.businessId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
    return { queued: true };
  }
}