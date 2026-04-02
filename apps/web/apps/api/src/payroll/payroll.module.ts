import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { Business } from '../entities/business.entity';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JournalEntry, JournalLine, Business]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
