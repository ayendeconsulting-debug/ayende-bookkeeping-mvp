import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { CcaService, CreateCcaAssetDto, UpdateCcaAssetDto } from './cca.service';

@Controller('cca')
export class CcaController {
  constructor(private readonly ccaService: CcaService) {}

  @Get('assets')
  findAll(@Req() req: Request) {
    return this.ccaService.findAll(req.user!.businessId);
  }

  @Post('assets')
  create(@Req() req: Request, @Body() dto: CreateCcaAssetDto) {
    return this.ccaService.create(req.user!.businessId, dto);
  }

  @Patch('assets/:id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateCcaAssetDto) {
    return this.ccaService.update(req.user!.businessId, id, dto);
  }

  @Delete('assets/:id')
  @HttpCode(204)
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.ccaService.remove(req.user!.businessId, id);
  }

  @Get('schedule')
  getSchedule(@Req() req: Request) {
    return this.ccaService.getSchedule(req.user!.businessId);
  }
}
