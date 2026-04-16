import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailTemplate } from './email-template.entity';
import { EmailSendLog } from './email-send-log.entity';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  subject: string;
  html_body: string;
  from_email?: string;
  from_name?: string;
  variables?: string[];
}

export interface UpdateTemplateDto {
  description?: string;
  subject?: string;
  html_body?: string;
  from_email?: string;
  from_name?: string;
  variables?: string[];
  is_active?: boolean;
}

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);
  private readonly resend: Resend;

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
    @InjectRepository(EmailSendLog)
    private readonly logRepo: Repository<EmailSendLog>,
    private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  findAll(): Promise<EmailTemplate[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.repo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async findByName(name: string): Promise<EmailTemplate | null> {
    return this.repo.findOne({ where: { name } });
  }

  async create(dto: CreateTemplateDto): Promise<EmailTemplate> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Template name "${dto.name}" already exists`);
    }
    const template = this.repo.create({
      ...dto,
      version: 1,
      is_active: true,
      variables: dto.variables ?? [],
    });
    return this.repo.save(template);
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    if (
      dto.subject !== undefined ||
      dto.html_body !== undefined ||
      dto.from_email !== undefined ||
      dto.from_name !== undefined
    ) {
      template.version = template.version + 1;
    }
    return this.repo.save(template);
  }

  async deactivate(id: string): Promise<{ success: boolean }> {
    const template = await this.findOne(id);
    template.is_active = false;
    await this.repo.save(template);
    return { success: true };
  }

  async reactivate(id: string): Promise<{ success: boolean }> {
    const template = await this.findOne(id);
    template.is_active = true;
    await this.repo.save(template);
    return { success: true };
  }

  async preview(
    id: string,
    sampleVars: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    const template = await this.findOne(id);
    return {
      subject: this.renderVars(template.subject, sampleVars),
      html:    this.renderVars(template.html_body, sampleVars),
    };
  }

  // ── Shared renderer ──────────────────────────────────────────────────────────
  renderVars(content: string, vars: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  // ── Core send — used by EmailService + AutomationsService + CampaignProcessor ─
  async sendFromTemplate(
    templateName: string,
    to: string,
    vars: Record<string, string>,
    fromOverride?: string,
  ): Promise<boolean> {
    const template = await this.repo.findOne({
      where: { name: templateName, is_active: true },
    });

    if (!template) {
      this.logger.warn(
        `sendFromTemplate: "${templateName}" not found or inactive — falling back to hardcoded`,
      );
      return false;
    }

    const subject   = this.renderVars(template.subject,   vars);
    const html      = this.renderVars(template.html_body, vars);
    const fromEmail = fromOverride ?? template.from_email ?? 'noreply@gettempo.ca';
    const fromName  = template.from_name ?? 'Tempo Books';

    try {
      const result = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });

      await this.logRepo.save(
        this.logRepo.create({
          to_email:      to,
          template_name: templateName,
          subject,
          trigger:       'email_service',
          status:        'sent',
          resend_id:     (result.data as any)?.id ?? null,
        }),
      );

      this.logger.log(`Template email sent: "${templateName}" → ${to}`);
      return true;
    } catch (err) {
      await this.logRepo.save(
        this.logRepo.create({
          to_email:      to,
          template_name: templateName,
          subject,
          trigger:       'email_service',
          status:        'failed',
        }),
      );
      this.logger.error(
        `sendFromTemplate "${templateName}" → ${to}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
