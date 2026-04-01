import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { JournalLine } from './journal-line.entity';
import { TaxCode } from './tax-code.entity';

@Entity('tax_transactions')
export class TaxTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  journal_line_id: string;

  @Column({ type: 'uuid' })
  tax_code_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  net_amount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  tax_amount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  gross_amount: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => JournalLine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journal_line_id' })
  journalLine: JournalLine;

  @ManyToOne(() => TaxCode, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tax_code_id' })
  taxCode: TaxCode;
}
