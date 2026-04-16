import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { AutomationRule } from './automation-rule.entity';
import { EmailSendLog } from './email-send-log.entity';
import { EmailTemplatesService } from './email-templates.service';

export interface CreateAutomationRuleDto {
  name: string;
  trigger_event: string;
  template_id: string;
  delay_minutes?: number;
}

export interface UpdateAutomationRuleDto {
  name?: string;
  trigger_event?: string;
  template_id?: string;
  delay_minutes?: number;
  is_active?: boolean;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);
  private readonly resend: Resend;

  constructor(
    @InjectRepository(AutomationRule)
    private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(EmailSendLog)
    private readonly logRepo: Repository<EmailSendLog>,
    private readonly templatesService: EmailTemplatesService,
    private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  findAll(): Promise<AutomationRule[]> {
    return this.ruleRepo.find({ order: { created_at: 'DESC' } });
  }

  async create(dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    await this.templatesService.findOne(dto.template_id);
    const rule = this.ruleRepo.create({
      ...dto,
      is_active: true,
      delay_minutes: dto.delay_minutes ?? 0,
    });
    return this.ruleRepo.save(rule);
  }

  async update(id: string, dto: UpdateAutomationRuleDto): Promise<AutomationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    if (dto.template_id && dto.template_id !== rule.template_id) {
      await this.templatesService.findOne(dto.template_id);
    }
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  async toggle(id: string): Promise<AutomationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    rule.is_active = !rule.is_active;
    return this.ruleRepo.save(rule);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    await this.ruleRepo.remove(rule);
    return { success: true };
  }

  // ── Core: fire all active rules for a trigger event ───────────────────────
  async fireRules(
    triggerEvent: string,
    vars: Record<string, string>,
  ): Promise<void> {
    const rules = await this.ruleRepo.find({
      where: { trigger_event: triggerEvent, is_active: true },
    });

    if (rules.length === 0) {
      this.logger.log(`No active rules for trigger: ${triggerEvent}`);
      return;
    }

    for (const rule of rules) {
      let template;
      try {
        template = await this.templatesService.findOne(rule.template_id);
      } catch {
        this.logger.warn(
          `Template ${rule.template_id} not found for rule "${rule.name}" — skipping`,
        );
        continue;
      }

      if (!template.is_active) {
        this.logger.warn(`Template "${template.name}" is inactive — skipping rule "${rule.name}"`);
        continue;
      }

      const toEmail = vars.email;
      if (!toEmail) {
        this.logger.warn(`No email in vars for trigger ${triggerEvent} — skipping rule "${rule.name}"`);
        continue;
      }

      const subject   = this.templatesService.renderVars(template.subject,   vars);
      const html      = this.templatesService.renderVars(template.html_body, vars);
      const fromName  = template.from_name  || 'Tempo Books';
      const fromEmail = template.from_email || 'noreply@gettempo.ca';

      try {
        const result = await this.resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: toEmail,
          subject,
          html,
        });

        await this.logRepo.save(
          this.logRepo.create({
            to_email:      toEmail,
            template_name: template.name,
            subject,
            trigger:       `automation:${triggerEvent}`,
            status:        'sent',
            resend_id:     (result.data as any)?.id ?? null,
          }),
        );

        this.logger.log(
          `Automation fired: "${rule.name}" (${triggerEvent}) → ${toEmail}`,
        );
      } catch (err) {
        await this.logRepo.save(
          this.logRepo.create({
            to_email:      toEmail,
            template_name: template.name,
            subject,
            trigger:       `automation:${triggerEvent}`,
            status:        'failed',
          }),
        );
        this.logger.error(
          `Automation failed: "${rule.name}" → ${toEmail}: ${(err as Error).message}`,
        );
      }
    }
  }
}
