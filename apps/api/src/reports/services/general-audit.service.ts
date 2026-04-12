import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

export interface GeneralAuditLogDto {
  businessId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}

@Injectable()
export class GeneralAuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(dto: GeneralAuditLogDto): Promise<void> {
    try {
      const entry = this.auditLogRepo.create({
        business_id: dto.businessId,
        user_id: dto.userId,
        action: dto.action,
        entity_type: dto.entityType,
        entity_id: dto.entityId,
        old_values: dto.oldValues ?? null,
        new_values: dto.newValues ?? null,
      });
      await this.auditLogRepo.save(entry);
    } catch (err) {
      // Audit log failures must never break the main operation
      console.error('[GeneralAuditService] Failed to write audit log:', err);
    }
  }

  async listForBusiness(
    businessId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepo.findAndCount({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
      take: Math.min(limit, 200),
      skip: offset,
    });
    return { data, total };
  }
}
