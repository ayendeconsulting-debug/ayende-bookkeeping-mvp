import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { FinancedVehicle } from './entities/financed-vehicle.entity';
import { VehiclePayment } from './entities/vehicle-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinancedVehicle, VehiclePayment])],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
