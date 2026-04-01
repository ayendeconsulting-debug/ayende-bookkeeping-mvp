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
import { TaxService } from '../services/tax.service';
import { CreateTaxCodeDto } from '../dto/create-tax-code.dto';
import { UpdateTaxCodeDto } from '../dto/update-tax-code.dto';

@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('codes')
  create(
    @Query('businessId') businessId: string,
    @Body() dto: CreateTaxCodeDto,
  ) {
    return this.taxService.create(businessId, dto);
  }

  @Get('codes')
  findAll(@Query('businessId') businessId: string) {
    return this.taxService.findAll(businessId);
  }

  @Get('codes/:id')
  findOne(
    @Query('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.taxService.findOne(businessId, id);
  }

  @Patch('codes/:id')
  update(
    @Query('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxCodeDto,
  ) {
    return this.taxService.update(businessId, id, dto);
  }

  @Delete('codes/:id')
  deactivate(
    @Query('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.taxService.deactivate(businessId, id);
  }
}
