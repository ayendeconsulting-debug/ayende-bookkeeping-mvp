import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { FirmsController } from './firms.controller';
import { FirmsService } from './firms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountantFirm, FirmStaff, FirmClient]),
  ],
  controllers: [FirmsController],
  providers: [FirmsService],
  exports: [FirmsService],
})
export class FirmsModule {}
