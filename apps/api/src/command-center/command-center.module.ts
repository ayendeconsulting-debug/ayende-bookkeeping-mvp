import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EmailTemplate } from './email-template.entity';
import { Campaign } from './campaign.entity';
import { CampaignRecipient } from './campaign-recipient.entity';
import { Subscription } from '../entities/subscription.entity';
import { Business } from '../entities/business.entity';
import { PlaidItem } from '../entities/plaid-item.entity';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesController } from './email-templates.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsController, SegmentationController } from './campaigns.controller';
import { SegmentationService } from './segmentation.service';
import { CampaignEmailProcessor } from './campaign-email.processor';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailTemplate,
      Campaign,
      CampaignRecipient,
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
  ],
  providers: [
    EmailTemplatesService,
    CampaignsService,
    SegmentationService,
    CampaignEmailProcessor,
    AdminGuard,
  ],
  exports: [EmailTemplatesService, SegmentationService],
})
export class CommandCenterModule {}
