import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FreelancerService } from './freelancer.service';
import { CreateMileageLogDto, TaxEstimateQueryDto } from './dto/freelancer.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('freelancer')
export class FreelancerController {
  constructor(private readonly freelancerService: FreelancerService) {}

  // ── Mileage ──────────────────────────────────────────────────────────

  /** GET /freelancer/mileage — all roles */
  @Get('mileage')
  getMileageLogs(
    @Req() req: Request,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.freelancerService.getMileageLogs(req.user!.businessId, yearNum);
  }

  /** POST /freelancer/mileage — admin only */
  @Roles('admin')
  @Post('mileage')
  createMileageLog(@Req() req: Request, @Body() dto: CreateMileageLogDto) {
    return this.freelancerService.createMileageLog(
      req.user!.businessId,
      req.user!.userId,
      dto,
    );
  }

  /** DELETE /freelancer/mileage/:id — admin only */
  @Roles('admin')
  @Delete('mileage/:id')
  deleteMileageLog(@Req() req: Request, @Param('id') id: string) {
    return this.freelancerService.deleteMileageLog(req.user!.businessId, id);
  }

  // ── Tax Estimate ──────────────────────────────────────────────────────

  /** GET /freelancer/tax-estimate — all roles */
  @Get('tax-estimate')
  getTaxEstimate(@Req() req: Request, @Query() query: TaxEstimateQueryDto) {
    const year = query.year ? parseInt(query.year, 10) : undefined;
    return this.freelancerService.getTaxEstimate(req.user!.businessId, year);
  }
}
