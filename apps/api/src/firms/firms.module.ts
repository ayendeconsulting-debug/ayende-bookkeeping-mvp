import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { FirmClientAccessRequest } from '../entities/firm-client-access-request.entity';
import { AccountantAuditLog } from '../entities/accountant-audit-log.entity';
import { Business } from '../entities/business.entity';
import { Account } from '../entities/account.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { FirmsController } from './firms.controller';
import { FirmsService } from './firms.service';
import { FirmClientService } from './firm-client.service';
import { FirmStaffService } from './firm-staff.service';
import { SubdomainMiddleware } from './subdomain.middleware';
import { ClientContextMiddleware } from './client-context.middleware';
import { BusinessesModule } from '../businesses/businesses.module';
import { ReportsModule } from '../reports/reports.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountantFirm,
      FirmStaff,
      FirmClient,
      FirmClientAccessRequest,
      AccountantAuditLog,
      Business,
      Account,
      JournalLine,
      JournalEntry,
      RawTransaction,
    ]),
    BusinessesModule,
    ReportsModule,
    EmailModule,
  ],
  controllers: [FirmsController],
  providers: [
    FirmsService,
    FirmClientService,
    FirmStaffService,
    SubdomainMiddleware,
    ClientContextMiddleware,
  ],
  exports: [FirmsService, FirmClientService, FirmStaffService],
})
export class FirmsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // SubdomainMiddleware — all routes (white-label branding)
    consumer.apply(SubdomainMiddleware).forRoutes('*');

    // ClientContextMiddleware — all routes except /firms/* (those operate on
    // firm context, not business context) and public routes
    consumer
      .apply(ClientContextMiddleware)
      .exclude(
        { path: 'firms/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.ALL },
        { path: 'plaid/webhook', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
