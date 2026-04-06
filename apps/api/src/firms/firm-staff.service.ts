import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirmStaff, FirmStaffRole } from '../entities/firm-staff.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmsService } from './firms.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

export interface InviteStaffDto {
  email: string;
  firstName?: string;
}

export interface StaffListItem {
  id: string;
  clerk_user_id: string;
  role: FirmStaffRole;
  invited_email: string | null;
  invited_at: Date;
  accepted_at: Date | null;
}

@Injectable()
export class FirmStaffService {
  constructor(
    @InjectRepository(FirmStaff)
    private readonly staffRepo: Repository<FirmStaff>,
    @InjectRepository(AccountantFirm)
    private readonly firmRepo: Repository<AccountantFirm>,
    private readonly firmsService: FirmsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── List ───────────────────────────────────────────────────────────────────

  async listStaff(clerkUserId: string): Promise<StaffListItem[]> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    const rows = await this.staffRepo.find({
      where: { firm_id: firm.id },
      order: { invited_at: 'ASC' },
    });

    return rows.map((s) => ({
      id: s.id,
      clerk_user_id: s.clerk_user_id,
      role: s.role,
      invited_email: s.invited_email,
      invited_at: s.invited_at,
      accepted_at: s.accepted_at,
    }));
  }

  // ── Invite ─────────────────────────────────────────────────────────────────

  /**
   * Creates a pending firm_staff row and sends a Resend invite email.
   * Only firm_owner may invite.
   * A user already in another firm receives HTTP 409.
   */
  async inviteStaff(
    clerkUserId: string,
    dto: InviteStaffDto,
  ): Promise<FirmStaff> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);
    await this.firmsService.assertFirmOwner(firm.id, clerkUserId);

    // Check seat limit — max 3 included, additional billed via Stripe metered
    // No hard cap here; billing handles overages. Just prevent duplicate invites.
    const existingByEmail = await this.staffRepo.findOne({
      where: { firm_id: firm.id, invited_email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException(
        `An invite has already been sent to ${dto.email}.`,
      );
    }

    // Create pending staff row — clerk_user_id is set to a placeholder until
    // the invitee signs up and the frontend calls acceptInvite()
    const staffRow = this.staffRepo.create({
      firm_id: firm.id,
      clerk_user_id: `pending_${Date.now()}_${dto.email}`, // temporary placeholder
      role: FirmStaffRole.STAFF,
      invited_email: dto.email,
      accepted_at: null,
    });

    const saved = await this.staffRepo.save(staffRow);

    // Fire-and-forget invite email
    const appUrl = this.config.get<string>('APP_URL') ?? 'https://gettempo.ca';
    void this.emailService.sendStaffInvite(dto.email, {
      firstName: dto.firstName ?? 'there',
      firmName: firm.name,
      signUpUrl: `${appUrl}/sign-up`,
    });

    return saved;
  }

  // ── Accept invite ──────────────────────────────────────────────────────────

  /**
   * Called by the frontend on first login when a pending invite is detected.
   * Matches on invited_email, sets accepted_at and the real clerk_user_id.
   */
  async acceptInvite(
    clerkUserId: string,
    email: string,
  ): Promise<FirmStaff | null> {
    const pendingRow = await this.staffRepo
      .createQueryBuilder('fs')
      .where('fs.invited_email = :email', { email })
      .andWhere('fs.accepted_at IS NULL')
      .getOne();

    if (!pendingRow) return null;

    // Check the accepting user is not already in another firm
    const existingMembership = await this.staffRepo.findOne({
      where: { clerk_user_id: clerkUserId },
    });
    if (existingMembership && existingMembership.id !== pendingRow.id) {
      throw new ConflictException(
        'You are already a member of another firm.',
      );
    }

    pendingRow.clerk_user_id = clerkUserId;
    pendingRow.accepted_at = new Date();
    return this.staffRepo.save(pendingRow);
  }

  // ── Remove ─────────────────────────────────────────────────────────────────

  /**
   * Hard-deletes a firm_staff row.
   * Only firm_owner may remove staff.
   * firm_owner cannot remove themselves.
   */
  async removeStaff(
    clerkUserId: string,
    staffRowId: string,
  ): Promise<void> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);
    await this.firmsService.assertFirmOwner(firm.id, clerkUserId);

    const staffRow = await this.staffRepo.findOne({
      where: { id: staffRowId, firm_id: firm.id },
    });

    if (!staffRow) {
      throw new NotFoundException(
        'Staff member not found or does not belong to your firm.',
      );
    }

    if (staffRow.role === FirmStaffRole.FIRM_OWNER) {
      throw new BadRequestException(
        'The firm owner cannot be removed from the firm.',
      );
    }

    await this.staffRepo.delete(staffRowId);
  }
}
