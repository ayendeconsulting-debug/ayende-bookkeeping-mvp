import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Lead, EnrichmentStatus } from './lead.entity';
import { LeadEnrichmentService } from './lead-enrichment.service';

export interface LeadEnrichmentJobData {
  leadId: string;
}

@Processor('lead-enrichment')
export class LeadEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(LeadEnrichmentProcessor.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly enrichmentService: LeadEnrichmentService,
  ) {
    super();
  }

  async process(job: Job<LeadEnrichmentJobData>): Promise<void> {
    const { leadId } = job.data;
    this.logger.log(
      `LeadEnrichment [${job.id}] start - lead ${leadId} (attempt ${job.attemptsMade + 1})`,
    );

    try {
      await this.enrichmentService.enrichLead(leadId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`LeadEnrichment [${job.id}] failed: ${msg}`);

      await this.leadRepo
        .update(
          { id: leadId },
          {
            enrichment_status: 'failed' as EnrichmentStatus,
            enrichment_error:  msg.substring(0, 490),
          },
        )
        .catch(() => {});
      throw err;
    }
  }
}
