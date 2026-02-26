import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './business.entity';
import { JournalEntry } from './journal-entry.entity';
import { Account } from './account.entity';

@Entity('journal_lines')
@Index(['business_id', 'account_id'])
@Index(['journal_entry_id', 'line_number'], { unique: true })
export class JournalLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  journal_entry_id: string;

  @Column({ type: 'integer' })
  line_number: number;

  @Column({ type: 'uuid' })
  account_id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit_amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_tax_line: boolean;

  @Column({ type: 'uuid', nullable: true })
  tax_code_id: string;

  @Column({ type: 'uuid', nullable: true })
  related_line_id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntry;

  @ManyToOne(() => Account, (account) => account.journalLines, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => JournalLine, { nullable: true })
  @JoinColumn({ name: 'related_line_id' })
  relatedLine: JournalLine;
}
