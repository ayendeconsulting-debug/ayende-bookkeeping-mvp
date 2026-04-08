import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { JournalLine } from './journal-line.entity';

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  LOCKED = 'locked',
}

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  entry_number: string;

  @Column({ type: 'date' })
  entry_date: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string;

  @Column({ type: 'uuid', nullable: true })
  reference_id: string;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status: JournalEntryStatus;

  // varchar — stores Clerk user IDs (user_xxx) or 'system'
  @Column({ type: 'varchar', length: 255 })
  created_by: string;

  // varchar — stores Clerk user IDs (user_xxx) or 'system'
  @Column({ type: 'varchar', length: 255, nullable: true })
  posted_by: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  posted_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  locked_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => JournalLine, (journalLine) => journalLine.journalEntry, {
    cascade: true,
  })
  lines: JournalLine[];
}
