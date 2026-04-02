import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessMode } from '../entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async findByClerkOrgId(clerkOrgId: string): Promise<Business | null> {
    return this.businessRepo.findOne({ where: { clerk_org_id: clerkOrgId } });
  }

  async findById(id: string): Promise<Business> {
    const business = await this.businessRepo.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found.');
    return business;
  }

  /**
   * Updates business fields.
   * `settings` is deep-merged with the existing jsonb value so callers
   * can set individual keys (e.g. { mode_selected: true }) without
   * wiping other settings keys.
   */
  async update(
    id: string,
    updates: {
      name?: string;
      fiscal_year_end?: string;
      currency_code?: string;
      mode?: BusinessMode;
      country?: string;
      settings?: Record<string, any>;
    },
  ): Promise<Business> {
    const business = await this.findById(id);

    if (updates.name !== undefined) business.name = updates.name;
    if (updates.fiscal_year_end !== undefined) business.fiscal_year_end = updates.fiscal_year_end as any;
    if (updates.currency_code !== undefined) business.currency_code = updates.currency_code;
    if (updates.mode !== undefined) business.mode = updates.mode;
    if (updates.country !== undefined) business.country = updates.country;

    // Deep-merge settings — preserve existing keys, overlay new ones
    if (updates.settings !== undefined) {
      business.settings = {
        ...(business.settings ?? {}),
        ...updates.settings,
      };
    }

    return this.businessRepo.save(business);
  }

  /**
   * Idempotent — safe to call on every page load.
   * Creates a business record for the Clerk org if one does not exist.
   */
  async provision(clerkOrgId: string, name: string): Promise<Business> {
    const existing = await this.findByClerkOrgId(clerkOrgId);
    if (existing) return existing;

    const business = this.businessRepo.create({
      name: name || 'My Business',
      clerk_org_id: clerkOrgId,
    });

    return this.businessRepo.save(business);
  }
}
