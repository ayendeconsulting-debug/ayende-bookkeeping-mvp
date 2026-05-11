import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Lead, LeadStatus, LeadType, EnrichmentStatus } from './lead.entity';
import { AutomationsService } from './automations.service';

export interface CreateLeadDto {
  first_name: string;
  last_name:  string;
  email:      string;
  company?:   string;
  title?:     string;
  phone?:     string;
  notes?:     string;
  source?:    string;
  type?:      LeadType;
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
}

export interface UpdateLeadDto {
  status?:     LeadStatus;
  notes?:      string;
  company?:    string;
  title?:      string;
  phone?:      string;
  first_name?: string;
  last_name?:  string;
  type?:       LeadType;
}

// -- Phase 36: Default skip-list when LEAD_ENRICHMENT_SKIP_DOMAINS env unset
const DEFAULT_SKIP_DOMAINS = [
  'gettempo.ca',
  'adeehinmidu.com',
  'ayendeconsulting.com',
  'example.com',
  'test.com',
];

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
    private readonly automationsService: AutomationsService,
    @InjectQueue('lead-enrichment')
    private readonly enrichmentQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  findAll(status?: LeadStatus): Promise<Lead[]> {
    const where: any = { deleted_at: IsNull() };
    if (status) where.status = status;
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  async upsert(dto: CreateLeadDto): Promise<Lead> {
    const normalised = dto.email.toLowerCase().trim();
    const existing   = await this.repo.findOne({ where: { email: normalised } });
    const isNew      = !existing;

    let lead: Lead;

    if (existing) {
      if (dto.first_name) existing.first_name = dto.first_name;
      if (dto.last_name)  existing.last_name  = dto.last_name;
      if (dto.company)    existing.company    = dto.company;
      if (dto.title)      existing.title      = dto.title;
      if (dto.phone)      existing.phone      = dto.phone;
      if (dto.notes)      existing.notes      = dto.notes;
      if (dto.type)       existing.type       = dto.type;
      lead = await this.repo.save(existing);
    } else {
      lead = await this.repo.save(
        this.repo.create({
          ...dto,
          email:  normalised,
          source: dto.source ?? 'manual',
          type:   dto.type   ?? 'inbound',
          status: 'new',
        }),
      );
    }

    if (isNew && lead.type === 'cold') {
      try {
        await this.automationsService.fireRules('lead.cold_created', {
          email:      lead.email,
          first_name: lead.first_name,
          last_name:  lead.last_name,
          company:    lead.company ?? '',
        });
      } catch (err) {
        this.logger.error(
          `lead.cold_created automation failed for ${lead.email}: ${(err as Error).message}`,
        );
      }
    }

    if (isNew && lead.type === 'inbound') {
      try {
        await this.automationsService.fireRules('lead.created', {
          email:      lead.email,
          first_name: lead.first_name,
          last_name:  lead.last_name,
          company:    lead.company ?? '',
        });
      } catch (err) {
        this.logger.error(
          `lead.created automation failed for ${lead.email}: ${(err as Error).message}`,
        );
      }
    }

    if (isNew) {
      await this.enqueueEnrichment(lead);
    }

    return lead;
  }

  private async enqueueEnrichment(lead: Lead): Promise<void> {
    try {
      const enabled = this.configService.get<string>('LEAD_ENRICHMENT_ENABLED') === 'true';
      if (!enabled) return;

      const skipDomainsRaw = this.configService.get<string>('LEAD_ENRICHMENT_SKIP_DOMAINS');
      const skipDomains = (skipDomainsRaw
        ? skipDomainsRaw.split(',').map(d => d.trim().toLowerCase())
        : DEFAULT_SKIP_DOMAINS);

      const emailDomain = lead.email.split('@')[1]?.toLowerCase() ?? '';

      if (skipDomains.includes(emailDomain)) {
        lead.enrichment_status = 'skipped' as EnrichmentStatus;
        await this.repo.save(lead);
        this.logger.log(`Lead ${lead.id} enrichment skipped (domain: ${emailDomain})`);
        return;
      }

      lead.enrichment_status = 'pending' as EnrichmentStatus;
      await this.repo.save(lead);

      await this.enrichmentQueue.add(
        'enrich',
        { leadId: lead.id },
        {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail:     false,
        },
      );

      this.logger.log(`Lead ${lead.id} enqueued for enrichment`);
    } catch (err) {
      this.logger.error(
        `Failed to enqueue enrichment for lead ${lead.id}: ${(err as Error).message}`,
      );
    }
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.repo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!lead) throw new NotFoundException('Lead not found');
    Object.assign(lead, dto);
    if (dto.status === 'converted' && !lead.converted_at) {
      lead.converted_at = new Date();
    }
    return this.repo.save(lead);
  }

  async softDelete(id: string): Promise<{ success: boolean }> {
    const lead = await this.repo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!lead) throw new NotFoundException('Lead not found');
    lead.deleted_at = new Date();
    await this.repo.save(lead);
    return { success: true };
  }

  async reenrichLead(id: string): Promise<{ success: boolean; status: string }> {
    const lead = await this.repo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!lead) throw new NotFoundException('Lead not found');

    const enabled = this.configService.get<string>('LEAD_ENRICHMENT_ENABLED') === 'true';
    if (!enabled) {
      this.logger.warn(`reenrichLead [${id}] aborted: LEAD_ENRICHMENT_ENABLED is false`);
      return { success: false, status: 'enrichment_disabled' };
    }

    lead.enrichment_status = 'pending' as EnrichmentStatus;
    lead.enrichment_error  = null;
    await this.repo.save(lead);

    try {
      await this.enrichmentQueue.add(
        'enrich',
        { leadId: lead.id },
        {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail:     false,
        },
      );
      this.logger.log(`Lead ${id} manually re-enqueued for enrichment`);
      return { success: true, status: 'queued' };
    } catch (err) {
      this.logger.error(`reenrichLead [${id}] enqueue failed: ${(err as Error).message}`);
      lead.enrichment_status = 'failed' as EnrichmentStatus;
      lead.enrichment_error  = (err as Error).message.substring(0, 490);
      await this.repo.save(lead);
      return { success: false, status: 'enqueue_failed' };
    }
  }

  async importCsv(rows: CreateLeadDto[]): Promise<{ imported: number; updated: number }> {
    let imported = 0;
    let updated  = 0;
    for (const row of rows) {
      if (!row.email?.trim()) continue;
      const exists = await this.repo.findOne({
        where: { email: row.email.toLowerCase().trim() },
      });
      if (exists) { updated++; } else { imported++; }
      await this.upsert({ ...row, source: 'csv_import' });
    }
    return { imported, updated };
  }
}
