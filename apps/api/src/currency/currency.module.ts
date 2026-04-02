import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Business } from '../entities/business.entity';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

/**
 * CurrencyModule — @Global()
 *
 * Making this module global means CurrencyService is available for injection
 * in any other module's providers (e.g. PlaidSyncProcessor) without those
 * modules explicitly importing CurrencyModule.
 *
 * Only needs to be imported once — in AppModule.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([RawTransaction, Business]),
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
