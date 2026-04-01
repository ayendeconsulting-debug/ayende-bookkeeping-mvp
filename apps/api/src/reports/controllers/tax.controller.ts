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

@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('codes')
  create(
    @Req() req: Request,
    @Body() dto: CreateTaxCodeDto,
  ) {
    return this.taxService.create(req.user!.businessId, dto);
  }

  @Get('codes')
  findAll(@Req() req: Request) {
    return this.taxService.findAll(req.user!.businessId);
  }

  @Get('codes/:id')
  findOne(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.taxService.findOne(req.user!.businessId, id);
  }

  @Patch('codes/:id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTaxCodeDto,
  ) {
    return this.taxService.update(req.user!.businessId, id, dto);
  }

  @Delete('codes/:id')
  deactivate(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.taxService.deactivate(req.user!.businessId, id);
  }
}
