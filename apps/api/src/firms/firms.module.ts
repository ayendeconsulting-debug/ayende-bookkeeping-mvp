import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { Business } from '../entities/business.entity';
import { Account } from '../entities/account.entity';
import { FirmsController } from './firms.controller';
import { FirmsService } from './firms.service';
import { FirmClientService } from './firm-client.service';
import { FirmStaffService } from './firm-staff.service';
import { SubdomainMiddleware } from './subdomain.middleware';
import { BusinessesModule } from '../businesses/businesses.module';
import { ReportsModule } from '../reports/reports.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountantFirm,
      FirmStaff,
      FirmClient,
      Business,
      Account,
    ]),
    BusinessesModule,
    ReportsModule,
    EmailModule,
  ],
  controllers: [FirmsController],
  providers: [FirmsService, FirmClientService, FirmStaffService, SubdomainMiddleware],
  exports: [FirmsService, FirmClientService, FirmStaffService],
})
export class FirmsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SubdomainMiddleware).forRoutes('*');
  }
}
