import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './business.entity';
import { BudgetCategory } from './budget-category.entity';

@Entity('personal_classification_rules')
@Index(['business_id', 'priority'])
export class PersonalRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  // 'keyword' or 'vendor'
  @Column({ type: 'varchar', length: 20 })
  match_type: string;

  @Column({ type: 'text' })
  match_value: string;

  @Column({ type: 'uuid' })
  budget_category_id: string;

  @Column({ type: 'integer', default: 10 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => BudgetCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_category_id' })
  budgetCategory: BudgetCategory;
}
