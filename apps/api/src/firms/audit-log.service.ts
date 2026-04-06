import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountantAuditLog } from '../entities/accountant-audit-log.entity';

export interface WriteAuditLogDto {
  businessId: string;
  firmId: string;
  actorClerkId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AccountantAuditLog)
    private readonly auditLogRepo: Repository<AccountantAuditLog>,
  ) {}

  // ── Write ─────────────────────────────────────────────────────────────────

  async write(dto: WriteAuditLogDto): Promise<AccountantAuditLog> {
    const entry = this.auditLogRepo.create({
      business_id: dto.businessId,
      firm_id: dto.firmId,
      actor_clerk_id: dto.actorClerkId,
      actor_name: dto.actorName,
      action: dto.action,
      entity_type: dto.entityType,
      entity_id: dto.entityId,
      before_snapshot: dto.beforeSnapshot ?? null,
      after_snapshot: dto.afterSnapshot ?? null,
    });
    return this.auditLogRepo.save(entry);
  }

  // ── List for accountant view (by firm + client) ───────────────────────────

  async listForClient(
    firmId: string,
    businessId: string,
    filters: AuditLogFilters = {},
  ): Promise<{ data: AccountantAuditLog[]; total: number }> {
    const { startDate, endDate, limit = 50, offset = 0 } = filters;

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.business_id = :businessId', { businessId })
      .andWhere('log.firm_id = :firmId', { firmId })
      .orderBy('log.performed_at', 'DESC')
      .take(Math.min(limit, 100))
      .skip(offset);

    if (startDate) {
      qb.andWhere('log.performed_at >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.performed_at <= :endDate', { endDate });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ── List for client view (all firms for this business) ────────────────────

  async listForBusiness(
    businessId: string,
    filters: AuditLogFilters = {},
  ): Promise<{ data: AccountantAuditLog[]; total: number }> {
    const { startDate, endDate, limit = 50, offset = 0 } = filters;

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.business_id = :businessId', { businessId })
      .orderBy('log.performed_at', 'DESC')
      .take(Math.min(limit, 100))
      .skip(offset);

    if (startDate) {
      qb.andWhere('log.performed_at >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.performed_at <= :endDate', { endDate });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
