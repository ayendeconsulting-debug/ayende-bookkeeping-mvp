import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../entities/business.entity';
import { Subscription } from '../entities/subscription.entity';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, Subscription, RawTransaction]),
    BusinessesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
