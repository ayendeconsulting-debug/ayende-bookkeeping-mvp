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
import { User } from './user.entity';

export enum BusinessUserRole {
  OWNER = 'owner',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

@Entity('business_users')
@Index(['business_id', 'user_id'], { unique: true })
export class BusinessUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: BusinessUserRole,
    default: BusinessUserRole.VIEWER,
  })
  role: BusinessUserRole;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, (business) => business.businessUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => User, (user) => user.businessUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
