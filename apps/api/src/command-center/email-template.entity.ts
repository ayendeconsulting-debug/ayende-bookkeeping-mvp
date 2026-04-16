import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  html_body: string;

  @Column({ length: 255, nullable: true })
  from_email: string;

  @Column({ length: 100, nullable: true })
  from_name: string;

  @Column({ type: 'jsonb', default: '[]' })
  variables: string[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
