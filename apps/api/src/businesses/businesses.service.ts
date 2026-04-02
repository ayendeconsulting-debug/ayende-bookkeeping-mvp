import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../entities/business.entity';

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

  async update(
    id: string,
    updates: { name?: string; fiscal_year_end?: string; currency_code?: string },
  ): Promise<Business> {
    const business = await this.findById(id);
    Object.assign(business, updates);
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
