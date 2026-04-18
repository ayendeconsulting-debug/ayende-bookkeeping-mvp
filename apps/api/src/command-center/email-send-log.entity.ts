import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('email_send_log')
export class EmailSendLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  to_email: string;

  @Column({ length: 100 })
  template_name: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ length: 100 })
  trigger: string;

  @Column({
    type: 'enum',
    enum: ['sent', 'failed', 'skipped_unsubscribed'],
    default: 'sent',
  })
  status: 'sent' | 'failed' | 'skipped_unsubscribed';

  @Column({ length: 255, nullable: true })
  resend_id: string;

  @CreateDateColumn()
  sent_at: Date;
}
