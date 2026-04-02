import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { RawTransaction } from './raw-transaction.entity';
import { JournalEntry } from './journal-entry.entity';

export enum DocumentFileType {
  PDF = 'pdf',
  JPG = 'jpg',
  PNG = 'png',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  // At least one of these must be set — a document is linked to either a
  // raw transaction (pre-posting) or a journal entry (post-posting), or both
  @Column({ type: 'uuid', nullable: true })
  raw_transaction_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  journal_entry_id: string | null;

  @Column({ type: 'varchar', length: 500 })
  file_name: string;

  @Column({
    type: 'enum',
    enum: DocumentFileType,
    enumName: 'document_file_type',
  })
  file_type: DocumentFileType;

  @Column({ type: 'integer' })
  file_size_bytes: number;

  // S3 object key — used to generate pre-signed download URLs
  @Column({ type: 'varchar', length: 1000 })
  s3_key: string;

  @Column({ type: 'varchar', length: 255 })
  s3_bucket: string;

  // Clerk user ID — varchar, not uuid
  @Column({ type: 'varchar', length: 255 })
  uploaded_by: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => RawTransaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'raw_transaction_id' })
  rawTransaction: RawTransaction | null;

  @ManyToOne(() => JournalEntry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntry | null;
}
