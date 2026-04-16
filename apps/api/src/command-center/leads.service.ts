import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';

export interface CreateLeadDto {
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  phone?: string;
  source?: string;
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
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
  ) {}

  findAll(status?: LeadStatus): Promise<Lead[]> {
    const where: Partial<Lead> & { deleted_at: null } = { deleted_at: null };
    if (status) (where as any).status = status;
    return this.repo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  // ── Upsert on email — duplicate submission updates record not creates ─────
  async upsert(dto: CreateLeadDto): Promise<Lead> {
    const normalised = dto.email.toLowerCase().trim();
    const existing = await this.repo.findOne({ where: { email: normalised } });

    if (existing) {
      if (dto.first_name) existing.first_name = dto.first_name;
      if (dto.last_name)  existing.last_name  = dto.last_name;
      if (dto.company)    existing.company    = dto.company;
      if (dto.phone)      existing.phone      = dto.phone;
      return this.repo.save(existing);
    }

    const lead = this.repo.create({
      ...dto,
      email: normalised,
      source: dto.source ?? 'manual',
      status: 'new',
    });
    return this.repo.save(lead);
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.repo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    Object.assign(lead, dto);

    // Auto-stamp converted_at when status changes to converted
    if (dto.status === 'converted' && !lead.converted_at) {
      lead.converted_at = new Date();
    }

    return this.repo.save(lead);
  }

  async softDelete(id: string): Promise<{ success: boolean }> {
    const lead = await this.repo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    lead.deleted_at = new Date();
    await this.repo.save(lead);
    return { success: true };
  }

  async importCsv(
    rows: CreateLeadDto[],
  ): Promise<{ imported: number; updated: number }> {
    let imported = 0;
    let updated = 0;
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
