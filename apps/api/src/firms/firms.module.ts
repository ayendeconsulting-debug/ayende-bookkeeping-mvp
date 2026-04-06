import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { Business } from '../entities/business.entity';
import { Account } from '../entities/account.entity';
import { FirmsController } from './firms.controller';
import { FirmsService } from './firms.service';
import { FirmClientService } from './firm-client.service';
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
    BusinessesModule, // provides BusinessesService (seedAccounts)
    ReportsModule,    // provides TaxSeedService + ProvinceConfigService
    EmailModule,      // provides EmailService (client invite)
  ],
  controllers: [FirmsController],
  providers: [FirmsService, FirmClientService],
  exports: [FirmsService, FirmClientService],
})
export class FirmsModule {}
