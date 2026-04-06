import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff, FirmStaffRole } from '../entities/firm-staff.entity';

export interface CreateFirmDto {
  name: string;
  subdomain: string;
}

export interface UpdateFirmDto {
  name?: string;
  subdomain?: string;
  logo_url?: string;
  brand_colour?: string;
}

@Injectable()
export class FirmsService {
  constructor(
    @InjectRepository(AccountantFirm)
    private readonly firmRepo: Repository<AccountantFirm>,
    @InjectRepository(FirmStaff)
    private readonly staffRepo: Repository<FirmStaff>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Lookups ────────────────────────────────────────────────────────────────

  async findByOwner(clerkUserId: string): Promise<AccountantFirm | null> {
    return this.firmRepo.findOne({ where: { owner_clerk_id: clerkUserId } });
  }

  async findByStaffMember(clerkUserId: string): Promise<AccountantFirm | null> {
    const staffRow = await this.staffRepo.findOne({
      where: { clerk_user_id: clerkUserId },
      relations: ['firm'],
    });
    return staffRow?.firm ?? null;
  }

  async findBySubdomain(subdomain: string): Promise<AccountantFirm | null> {
    return this.firmRepo.findOne({ where: { subdomain: subdomain.toLowerCase() } });
  }

  async findById(id: string): Promise<AccountantFirm | null> {
    return this.firmRepo.findOne({ where: { id } });
  }

  /**
   * Returns the firm for any authenticated user — whether they are the owner
   * or a staff member. This is the primary lookup used by all /firms/me endpoints.
   */
  async getMyFirm(clerkUserId: string): Promise<AccountantFirm> {
    const firm =
      (await this.findByOwner(clerkUserId)) ??
      (await this.findByStaffMember(clerkUserId));

    if (!firm) {
      throw new NotFoundException('No firm found for this user.');
    }
    return firm;
  }

  // ── Membership check ───────────────────────────────────────────────────────

  async assertFirmMember(firmId: string, clerkUserId: string): Promise<FirmStaff> {
    const staffRow = await this.staffRepo.findOne({
      where: { firm_id: firmId, clerk_user_id: clerkUserId },
    });
    if (!staffRow) {
      throw new ForbiddenException('You are not a member of this firm.');
    }
    return staffRow;
  }

  async assertFirmOwner(firmId: string, clerkUserId: string): Promise<void> {
    const staffRow = await this.assertFirmMember(firmId, clerkUserId);
    if (staffRow.role !== FirmStaffRole.FIRM_OWNER) {
      throw new ForbiddenException('Only the firm owner can perform this action.');
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new firm and a firm_owner staff row atomically.
   * A user may only own one firm.
   */
  async createFirm(clerkUserId: string, dto: CreateFirmDto): Promise<AccountantFirm> {
    // One firm per owner
    const existing = await this.findByOwner(clerkUserId);
    if (existing) {
      throw new ConflictException('You already own a firm. A user may only own one firm.');
    }

    // Subdomain uniqueness (also enforced at DB level)
    const subdomainLower = dto.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const subdomainTaken = await this.findBySubdomain(subdomainLower);
    if (subdomainTaken) {
      throw new ConflictException(`The subdomain "${subdomainLower}" is already taken.`);
    }

    return this.dataSource.transaction(async (manager) => {
      const firm = manager.create(AccountantFirm, {
        name: dto.name,
        subdomain: subdomainLower,
        owner_clerk_id: clerkUserId,
        logo_url: null,
        brand_colour: null,
        stripe_customer_id: null,
      });
      const savedFirm = await manager.save(AccountantFirm, firm);

      // Auto-create firm_owner staff row
      const ownerStaff = manager.create(FirmStaff, {
        firm_id: savedFirm.id,
        clerk_user_id: clerkUserId,
        role: FirmStaffRole.FIRM_OWNER,
        invited_email: null,
        accepted_at: new Date(), // Owner is immediately accepted
      });
      await manager.save(FirmStaff, ownerStaff);

      return savedFirm;
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateFirm(clerkUserId: string, dto: UpdateFirmDto): Promise<AccountantFirm> {
    const firm = await this.getMyFirm(clerkUserId);

    // Only firm_owner may update settings
    await this.assertFirmOwner(firm.id, clerkUserId);

    // Subdomain change — validate uniqueness
    if (dto.subdomain && dto.subdomain !== firm.subdomain) {
      const subdomainLower = dto.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const taken = await this.findBySubdomain(subdomainLower);
      if (taken && taken.id !== firm.id) {
        throw new ConflictException(`The subdomain "${subdomainLower}" is already taken.`);
      }
      dto.subdomain = subdomainLower;
    }

    Object.assign(firm, dto);
    return this.firmRepo.save(firm);
  }

  // ── Branding (public — used by white-label middleware) ─────────────────────

  async getBranding(subdomain: string): Promise<{
    name: string;
    logo_url: string | null;
    brand_colour: string | null;
  } | null> {
    const firm = await this.findBySubdomain(subdomain);
    if (!firm) return null;
    return {
      name: firm.name,
      logo_url: firm.logo_url,
      brand_colour: firm.brand_colour,
    };
  }
}
