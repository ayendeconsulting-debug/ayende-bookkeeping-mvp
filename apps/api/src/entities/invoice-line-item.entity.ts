import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { TaxCode } from './tax-code.entity';

@Entity('invoice_line_items')
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  invoice_id: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  // Optional — when set, tax is calculated and included in invoice totals
  @Column({ type: 'uuid', nullable: true })
  tax_code_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  line_total: number;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  // Relationships
  @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => TaxCode, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tax_code_id' })
  taxCode: TaxCode | null;
}
