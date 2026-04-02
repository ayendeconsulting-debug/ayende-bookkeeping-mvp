import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TaxService } from '../services/tax.service';
import { CreateTaxCodeDto } from '../dto/create-tax-code.dto';
import { UpdateTaxCodeDto } from '../dto/update-tax-code.dto';
import { Roles } from '../../auth/roles.decorator';

@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  /** POST /tax/codes — admin only */
  @Roles('admin')
  @Post('codes')
  create(@Req() req: Request, @Body() dto: CreateTaxCodeDto) {
    return this.taxService.create(req.user!.businessId, dto);
  }

  /** GET /tax/codes — all roles */
  @Get('codes')
  findAll(@Req() req: Request) {
    return this.taxService.findAll(req.user!.businessId);
  }

  /** GET /tax/codes/:id — all roles */
  @Get('codes/:id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.taxService.findOne(req.user!.businessId, id);
  }

  /** PATCH /tax/codes/:id — admin only */
  @Roles('admin')
  @Patch('codes/:id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateTaxCodeDto) {
    return this.taxService.update(req.user!.businessId, id, dto);
  }

  /** DELETE /tax/codes/:id (deactivate) — admin only */
  @Roles('admin')
  @Delete('codes/:id')
  deactivate(@Req() req: Request, @Param('id') id: string) {
    return this.taxService.deactivate(req.user!.businessId, id);
  }
}
