import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_preferences')
export class EmailPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ default: false })
  unsubscribe_tips: boolean;

  @Column({ default: false })
  unsubscribe_broadcasts: boolean;

  @Column({ default: false })
  unsubscribe_partnership: boolean;

  @Column({ default: false })
  unsubscribe_cold: boolean;

  @Column({ default: false })
  unsubscribed_all: boolean;

  @UpdateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
