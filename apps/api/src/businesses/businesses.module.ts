import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../entities/business.entity';
import { Account } from '../entities/account.entity';
import { TaxCode } from '../entities/tax-code.entity';
import { FirmClientAccessRequest } from '../entities/firm-client-access-request.entity';
import { AccountantAuditLog } from '../entities/accountant-audit-log.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { ReportsModule } from '../reports/reports.module';
import { TaxSeedService } from '../reports/services/tax-seed.service';
import { CommandCenterModule } from '../command-center/command-center.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      Account,
      TaxCode,
      FirmClientAccessRequest,
      AccountantAuditLog,
    ]),
    ReportsModule,
    CommandCenterModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, TaxSeedService],
  exports: [BusinessesService, TaxSeedService],
})
export class BusinessesModule {}
