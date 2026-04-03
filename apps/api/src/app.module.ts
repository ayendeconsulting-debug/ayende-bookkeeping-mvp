import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AccountingModule } from './accounting/accounting.module';
import { PlaidModule } from './plaid/plaid.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { InvoiceModule } from './invoice/invoice.module';
import { RecurringModule } from './recurring/recurring.module';
import { DocumentsModule } from './documents/documents.module';
import { CurrencyModule } from './currency/currency.module';
import { FreelancerModule } from './freelancer/freelancer.module';
import { PersonalModule } from './personal/personal.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health.controller';

function getRedisBullMQConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      username: url.username !== 'default' ? url.username : undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    };
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    BullModule.forRoot({ connection: getRedisBullMQConnection() }),
    // Rate limiting: 100 requests per IP per 60 seconds globally
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    BusinessesModule,
    CurrencyModule,
    AccountingModule,
    PlaidModule,
    ReportsModule,
    AiModule,
    InvoiceModule,
    RecurringModule,
    DocumentsModule,
    FreelancerModule,
    PersonalModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
