import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import { CampaignsService, CreateCampaignDto } from './campaigns.service';
import { SegmentationService } from './segmentation.service';

// ── Campaigns ──────────────────────────────────────────────────────────────

@Controller('admin/campaigns')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  /** GET /admin/campaigns */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** POST /admin/campaigns */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCampaignDto, @Request() req: any) {
    return this.service.create({
      ...dto,
      created_by: req.user?.sub ?? req.user?.userId ?? undefined,
    });
  }

  /** GET /admin/campaigns/:id/recipients — must be before :id/send|cancel */
  @Get(':id/recipients')
  getRecipients(@Param('id') id: string) {
    return this.service.getRecipients(id);
  }

  /** POST /admin/campaigns/:id/send */
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  send(@Param('id') id: string) {
    return this.service.send(id);
  }

  /** POST /admin/campaigns/:id/cancel */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}

// ── Segments ───────────────────────────────────────────────────────────────

@Controller('admin/segments')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class SegmentationController {
  constructor(private readonly service: SegmentationService) {}

  /** GET /admin/segments — returns all segments with live counts */
  @Get()
  getSegments() {
    return this.service.getSegmentInfos();
  }
}
