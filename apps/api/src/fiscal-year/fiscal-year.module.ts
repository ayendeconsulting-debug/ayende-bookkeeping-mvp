import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalYear } from '../entities/fiscal-year.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { FiscalYearLockService } from './fiscal-year-lock.service';
import { FiscalYearController } from './fiscal-year.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FiscalYear, JournalEntry]),
  ],
  controllers: [FiscalYearController],
  providers: [FiscalYearLockService],
  exports: [FiscalYearLockService],
})
export class FiscalYearModule {}
