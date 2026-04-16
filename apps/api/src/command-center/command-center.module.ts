import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EmailTemplate } from './email-template.entity';
import { Campaign } from './campaign.entity';
import { CampaignRecipient } from './campaign-recipient.entity';
import { Lead } from './lead.entity';
import { AutomationRule } from './automation-rule.entity';
import { EmailSendLog } from './email-send-log.entity';
import { Subscription } from '../entities/subscription.entity';
import { Business } from '../entities/business.entity';
import { PlaidItem } from '../entities/plaid-item.entity';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesController } from './email-templates.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsController, SegmentationController } from './campaigns.controller';
import { SegmentationService } from './segmentation.service';
import { CampaignEmailProcessor } from './campaign-email.processor';
import { LeadsService } from './leads.service';
import { AdminLeadsController, PublicLeadsController } from './leads.controller';
import { AutomationsService } from './automations.service';
import { AdminAutomationsController } from './automations.controller';
import { TemplateSeedService } from './template-seed.service';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailTemplate,
      Campaign,
      CampaignRecipient,
      Lead,
      AutomationRule,
      EmailSendLog,
      Subscription,
      Business,
      PlaidItem,
    ]),
    BullModule.registerQueue({ name: 'campaign-email' }),
  ],
  controllers: [
    EmailTemplatesController,
    CampaignsController,
    SegmentationController,
    AdminLeadsController,
    PublicLeadsController,
    AdminAutomationsController,
  ],
  providers: [
    EmailTemplatesService,
    CampaignsService,
    SegmentationService,
    CampaignEmailProcessor,
    LeadsService,
    AutomationsService,
    TemplateSeedService,
    AdminGuard,
  ],
  exports: [EmailTemplatesService, SegmentationService, LeadsService, AutomationsService],
})
export class CommandCenterModule {}
