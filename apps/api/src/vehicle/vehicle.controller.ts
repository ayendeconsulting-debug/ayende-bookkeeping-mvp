import {
  Controller, Get, Post, Patch, Body, Param, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { VehicleService } from './vehicle.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  RecordPaymentDto,
  AllocateUsageDto,
} from './dto/vehicle.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  getVehicles(@Req() req: Request) {
    return this.vehicleService.getVehicles(req.user!.businessId);
  }

  @Roles('admin')
  @Post()
  createVehicle(@Req() req: Request, @Body() dto: CreateVehicleDto) {
    return this.vehicleService.createVehicle(req.user!.businessId, dto);
  }

  @Get(':id')
  getVehicle(@Req() req: Request, @Param('id') id: string) {
    return this.vehicleService.getVehicle(req.user!.businessId, id);
  }

  @Roles('admin')
  @Patch(':id')
  updateVehicle(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicleService.updateVehicle(req.user!.businessId, id, dto);
  }

  @Get(':id/schedule')
  getSchedule(@Req() req: Request, @Param('id') id: string) {
    return this.vehicleService.getAmortizationSchedule(req.user!.businessId, id);
  }

  @Roles('admin')
  @Post(':id/payments')
  recordPayment(@Req() req: Request, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.vehicleService.recordPayment(req.user!.businessId, id, dto);
  }

  @Roles('admin')
  @Post(':id/allocate')
  allocateUsage(@Req() req: Request, @Param('id') id: string, @Body() dto: AllocateUsageDto) {
    return this.vehicleService.allocateUsage(req.user!.businessId, id, dto);
  }
}
