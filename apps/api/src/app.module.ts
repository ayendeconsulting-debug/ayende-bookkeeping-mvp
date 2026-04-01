import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AccountingModule } from './accounting/accounting.module';
import { PlaidModule } from './plaid/plaid.module';

@Module({
  imports: [
    // Load .env file globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Database connection
    DatabaseModule,

    // BullMQ — Redis connection shared across all queues
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    // Phase 1 — Accounting Engine
    AccountingModule,

    // Phase 2 — Plaid Integration
    PlaidModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
