import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard';
import { InsightsService } from './insights.service';

@Controller('admin/insights')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  getInsights(@Query('range') range: string = '30d') {
    return this.insightsService.getAll(range);
  }
}
