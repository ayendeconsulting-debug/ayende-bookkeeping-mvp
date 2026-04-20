import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { Campaign } from './campaign.entity';
import { CampaignRecipient } from './campaign-recipient.entity';
import { SegmentationService } from './segmentation.service';
import { EmailTemplatesService } from './email-templates.service';
import { CampaignEmailJobData } from './campaign-email.processor';

export interface CreateCampaignDto {
  name: string;
  template_id: string;
  segment_key: string;
  scheduled_at?: string;
  created_by?: string;
  // Phase 25: variable values to inject into every email in this campaign
  template_variables?: Record<string, string>;
  // Phase 25: optional allowlist of emails -- restricts segment at send time
  recipient_filter?: string[];
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignRecipient)
    private readonly recipientRepo: Repository<CampaignRecipient>,
    @InjectQueue('campaign-email')
    private readonly campaignQueue: Queue,
    private readonly segmentationService: SegmentationService,
    private readonly templatesService: EmailTemplatesService,
  ) {}

  findAll(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      relations: ['template'],
      order: { created_at: 'DESC' },
    });
  }

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    const template = await this.templatesService.findOne(dto.template_id);
    if (!template.is_active) {
      throw new BadRequestException(
        'Template is inactive -- activate it before creating a campaign',
      );
    }

    const campaign = this.campaignRepo.create({
      name:               dto.name.trim(),
      template_id:        dto.template_id,
      segment_key:        dto.segment_key,
      status:             'draft',
      created_by:         dto.created_by ?? null,
      scheduled_at:       dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      template_variables: dto.template_variables ?? null,
      recipient_filter:   dto.recipient_filter ?? null,
    });
    return this.campaignRepo.save(campaign);
  }

  async send(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (['sending', 'sent', 'cancelled'].includes(campaign.status)) {
      throw new BadRequestException(
        `Cannot send a campaign with status: ${campaign.status}`,
      );
    }

    // Resolve segment -> full recipient list
    let recipients = await this.segmentationService.resolve(campaign.segment_key);

    // Phase 25: apply recipient filter if present
    if (campaign.recipient_filter && campaign.recipient_filter.length > 0) {
      const filterSet = new Set(campaign.recipient_filter);
      recipients = recipients.filter((r) => filterSet.has(r.email));
    }

    if (recipients.length === 0) {
      throw new BadRequestException(
        'Segment resolved to 0 recipients -- no emails to send',
      );
    }

    // Persist recipient rows
    const recipientRows = this.recipientRepo.create(
      recipients.map((r) => ({
        campaign_id:   id,
        email:         r.email,
        business_name: r.businessName,
        status:        'pending' as const,
      })),
    );
    const saved = await this.recipientRepo.save(recipientRows);

    // Phase 25: compute BullMQ delay for scheduled campaigns
    const now         = Date.now();
    const isScheduled = !!(campaign.scheduled_at && campaign.scheduled_at.getTime() > now);
    const delay       = isScheduled ? Math.max(0, campaign.scheduled_at!.getTime() - now) : 0;

    // Update campaign status
    campaign.status          = isScheduled ? 'scheduled' : 'sending';
    campaign.recipient_count = recipients.length;
    await this.campaignRepo.save(campaign);

    // Enqueue one BullMQ job per recipient (delayed when scheduled)
    await Promise.all(
      saved.map((r) =>
        this.campaignQueue.add(
          'send-email',
          {
            campaignId:        id,
            recipientId:       r.id,
            email:             r.email,
            businessName:      r.business_name ?? '',
            templateId:        campaign.template_id,
            templateVariables: campaign.template_variables ?? {},
          } as CampaignEmailJobData,
          {
            attempts: 2,
            backoff: { type: 'fixed', delay: 5000 },
            ...(delay > 0 ? { delay } : {}),
          },
        ),
      ),
    );

    return campaign;
  }

  async cancel(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new BadRequestException(
        'Only draft or scheduled campaigns can be cancelled',
      );
    }
    campaign.status = 'cancelled';
    return this.campaignRepo.save(campaign);
  }

  async getRecipients(id: string): Promise<CampaignRecipient[]> {
    return this.recipientRepo.find({
      where: { campaign_id: id },
      order: { status: 'ASC', email: 'ASC' },
    });
  }
}
