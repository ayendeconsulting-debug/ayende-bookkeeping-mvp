import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerController } from './freelancer.controller';
import { FreelancerService } from './freelancer.service';
import { MileageLog } from '../entities/mileage-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MileageLog])],
  controllers: [FreelancerController],
  providers: [FreelancerService],
  exports: [FreelancerService],
})
export class FreelancerModule {}
