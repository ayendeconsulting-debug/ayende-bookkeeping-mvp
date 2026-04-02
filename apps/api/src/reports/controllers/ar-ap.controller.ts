import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ArApService } from '../services/ar-ap.service';
import { CreateArApDto, UpdateArApDto, RecordArApPaymentDto } from '../dto/ar-ap.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('ar-ap')
export class ArApController {
  constructor(private readonly arApService: ArApService) {}

  /** POST /ar-ap — admin only */
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateArApDto) {
    return this.arApService.create(req.user!.businessId, dto);
  }

  /** GET /ar-ap — all roles */
  @Get()
  findAll(
    @Req() req: Request,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.arApService.findAll(req.user!.businessId, {
      type,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /** GET /ar-ap/summary — all roles (dashboard widget) */
  @Get('summary')
  getSummary(@Req() req: Request) {
    return this.arApService.getSummary(req.user!.businessId);
  }

  /** GET /ar-ap/:id — all roles */
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.arApService.findOne(req.user!.businessId, id);
  }

  /** PATCH /ar-ap/:id — admin only */
  @Roles('admin')
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateArApDto,
  ) {
    return this.arApService.update(req.user!.businessId, id, dto);
  }

  /** POST /ar-ap/:id/pay — admin only */
  @Roles('admin')
  @Post(':id/pay')
  recordPayment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: RecordArApPaymentDto,
  ) {
    return this.arApService.recordPayment(
      req.user!.businessId,
      id,
      dto,
      req.user!.userId,
    );
  }

  /** POST /ar-ap/:id/void — admin only */
  @Roles('admin')
  @Post(':id/void')
  voidRecord(@Req() req: Request, @Param('id') id: string) {
    return this.arApService.voidRecord(req.user!.businessId, id);
  }
}
