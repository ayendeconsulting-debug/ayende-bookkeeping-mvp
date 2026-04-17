import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Lead, LeadStatus, LeadType } from './lead.entity';
import { AutomationsService } from './automations.service';

export interface CreateLeadDto {
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  phone?: string;
  source?: string;
  type?: LeadType;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface UpdateLeadDto {
  status?: LeadStatus;
  notes?: string;
  company?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  type?: LeadType;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
    private readonly automationsService: AutomationsService,
  ) {}

  findAll(status?: LeadStatus): Promise<Lead[]> {
    const where: any = { deleted_at: IsNull() };
    if (status) where.status = status;
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  // ── Upsert on email — duplicate submission updates record not creates ──────
  async upsert(dto: CreateLeadDto): Promise<Lead> {
    const normalised = dto.email.toLowerCase().trim();
    const existing   = await this.repo.findOne({ where: { email: normalised } });
    const isNew      = !existing;

    let lead: Lead;

    if (existing) {
      if (dto.first_name) existing.first_name = dto.first_name;
      if (dto.last_name)  existing.last_name  = dto.last_name;
      if (dto.company)    existing.company    = dto.company;
      if (dto.phone)      existing.phone      = dto.phone;
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

    // Fire automation for brand-new cold leads only
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

    // Fire automation for brand-new inbound leads
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

    return lead;
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
