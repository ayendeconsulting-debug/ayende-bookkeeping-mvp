import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import { CampaignRecipient } from './campaign-recipient.entity';
import { Campaign } from './campaign.entity';
import { EmailTemplatesService } from './email-templates.service';

export interface CampaignEmailJobData {
  campaignId: string;
  recipientId: string;
  email: string;
  businessName: string;
  templateId: string;
}

@Processor('campaign-email')
export class CampaignEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignEmailProcessor.name);
  private readonly resend: Resend;

  constructor(
    @InjectRepository(CampaignRecipient)
    private readonly recipientRepo: Repository<CampaignRecipient>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly templatesService: EmailTemplatesService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async process(job: Job<CampaignEmailJobData>): Promise<void> {
    const { campaignId, recipientId, email, businessName, templateId } = job.data;

    try {
      const template = await this.templatesService.findOne(templateId);

      const vars: Record<string, string> = {
        business_name: businessName,
        first_name: businessName,
      };

      const subject = this.templatesService.renderVars(template.subject, vars);
      const html = this.templatesService.renderVars(template.html_body, vars);

      const fromName  = template.from_name  || 'Tempo Books';
      const fromEmail = template.from_email || 'noreply@gettempo.ca';

      await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject,
        html,
      });

      await this.recipientRepo.update(recipientId, {
        status: 'sent',
        sent_at: new Date(),
      });

      this.logger.log(`Campaign email sent → ${email} (campaign: ${campaignId})`);
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error';
      await this.recipientRepo.update(recipientId, {
        status: 'failed',
        error_message: msg.substring(0, 490),
      });
      this.logger.error(`Campaign email failed → ${email}: ${msg}`);
    }

    // Check if all recipients for this campaign are done
    await this.checkCampaignComplete(campaignId);
  }

  private async checkCampaignComplete(campaignId: string): Promise<void> {
    const pendingCount = await this.recipientRepo.count({
      where: { campaign_id: campaignId, status: 'pending' },
    });

    if (pendingCount === 0) {
      const sentCount = await this.recipientRepo.count({
        where: { campaign_id: campaignId, status: 'sent' },
      });
      if (sentCount > 0) {
        await this.campaignRepo.update(campaignId, {
          status: 'sent',
          sent_at: new Date(),
        });
        this.logger.log(`Campaign ${campaignId} marked as sent`);
      }
    }
  }
}
