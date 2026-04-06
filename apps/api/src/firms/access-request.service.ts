import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FirmClientAccessRequest,
  AccessRequestStatus,
  AccessRequestType,
} from '../entities/firm-client-access-request.entity';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { Business } from '../entities/business.entity';
import { FirmsService } from './firms.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

export interface CreateAccessRequestDto {
  businessId: string;
  accessNote: string;
  durationType: '90_days' | 'year_end' | 'custom';
  customExpiresAt?: string; // ISO date string — required when durationType = 'custom'
}

export interface RespondToAccessRequestDto {
  decision: 'approved' | 'denied';
  customExpiresAt?: string; // ISO date string — client may set custom expiry on approval
}

@Injectable()
export class AccessRequestService {
  constructor(
    @InjectRepository(FirmClientAccessRequest)
    private readonly requestRepo: Repository<FirmClientAccessRequest>,
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
    @InjectRepository(FirmStaff)
    private readonly firmStaffRepo: Repository<FirmStaff>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly firmsService: FirmsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── Create access request (accountant → client) ───────────────────────────

  async createRequest(
    clerkUserId: string,
    dto: CreateAccessRequestDto,
  ): Promise<FirmClientAccessRequest> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    // Verify firm owns this client
    const firmClient = await this.firmClientRepo.findOne({
      where: {
        firm_id: firm.id,
        business_id: dto.businessId,
        status: FirmClientStatus.ACTIVE,
      },
    });
    if (!firmClient) {
      throw new NotFoundException('Client not found or not active in your firm.');
    }

    // Check no pending request already exists
    const existing = await this.requestRepo.findOne({
      where: {
        firm_id: firm.id,
        business_id: dto.businessId,
        status: AccessRequestStatus.PENDING,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A pending access request already exists for this client.',
      );
    }

    // Calculate requested expiry for display in email
    const requestedExpiry = this.calculateExpiry(dto.durationType, dto.customExpiresAt);

    const request = this.requestRepo.create({
      firm_id: firm.id,
      business_id: dto.businessId,
      requested_by_clerk_id: clerkUserId,
      access_type: AccessRequestType.EDIT,
      status: AccessRequestStatus.PENDING,
      access_note: dto.accessNote,
      custom_expires_at: dto.durationType === 'custom' && dto.customExpiresAt
        ? new Date(dto.customExpiresAt)
        : null,
    });

    const saved = await this.requestRepo.save(request);

    // Fetch business owner email to notify
    const business = await this.businessRepo.findOne({
      where: { id: dto.businessId },
    });

    if (business?.clerk_org_id) {
      const appUrl = this.config.get<string>('APP_URL') ?? 'https://gettempo.ca';
      void this.emailService.sendAccessRequest(business.clerk_org_id, {
        firmName: firm.name,
        accountantName: clerkUserId, // display name resolved on frontend
        accessNote: dto.accessNote,
        requestedExpiry: requestedExpiry.toLocaleDateString('en-CA', {
          year: 'numeric', month: 'long', day: 'numeric',
        }),
        approveUrl: `${appUrl}/dashboard?access_request=${saved.id}&action=approve`,
        denyUrl: `${appUrl}/dashboard?access_request=${saved.id}&action=deny`,
      });
    }

    return saved;
  }

  // ── Respond to access request (client → accountant) ───────────────────────

  async respondToRequest(
    businessId: string,
    requestId: string,
    dto: RespondToAccessRequestDto,
  ): Promise<FirmClientAccessRequest> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId, business_id: businessId },
      relations: ['firm'],
    });

    if (!request) {
      throw new NotFoundException('Access request not found.');
    }
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been responded to.');
    }

    const now = new Date();
    request.responded_at = now;

    if (dto.decision === 'approved') {
      request.status = AccessRequestStatus.APPROVED;
      // Client-set custom expiry takes priority, otherwise use 90-day default
      if (dto.customExpiresAt) {
        request.expires_at = new Date(dto.customExpiresAt);
      } else if (request.custom_expires_at) {
        request.expires_at = request.custom_expires_at;
      } else {
        const expiry = new Date(now);
        expiry.setDate(expiry.getDate() + 90);
        request.expires_at = expiry;
      }
    } else {
      request.status = AccessRequestStatus.DENIED;
    }

    const saved = await this.requestRepo.save(request);

    // Notify accountant of response
    const firmStaff = await this.firmStaffRepo.findOne({
      where: { clerk_user_id: request.requested_by_clerk_id },
    });

    if (firmStaff?.invited_email) {
      void this.emailService.sendAccessResponse(firmStaff.invited_email, {
        firmName: request.firm?.name ?? 'Your firm',
        decision: dto.decision,
        businessName: businessId, // resolved on email template side
        expiresAt: request.expires_at
          ? request.expires_at.toLocaleDateString('en-CA', {
              year: 'numeric', month: 'long', day: 'numeric',
            })
          : undefined,
      });
    }

    return saved;
  }

  // ── List requests for a client business (accountant view) ─────────────────

  async listRequestsForClient(
    clerkUserId: string,
    businessId: string,
  ): Promise<FirmClientAccessRequest[]> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    return this.requestRepo.find({
      where: { firm_id: firm.id, business_id: businessId },
      order: { requested_at: 'DESC' },
    });
  }

  // ── List requests for a business (client view) ────────────────────────────

  async listRequestsForBusiness(
    businessId: string,
  ): Promise<FirmClientAccessRequest[]> {
    return this.requestRepo.find({
      where: { business_id: businessId },
      relations: ['firm'],
      order: { requested_at: 'DESC' },
    });
  }

  // ── Get active approved request (used by FirmMembershipGuard) ─────────────

  async getActiveApprovedRequest(
    firmId: string,
    businessId: string,
  ): Promise<FirmClientAccessRequest | null> {
    const requests = await this.requestRepo.find({
      where: {
        firm_id: firmId,
        business_id: businessId,
        status: AccessRequestStatus.APPROVED,
      },
      order: { expires_at: 'DESC' },
    });

    const now = new Date();
    return requests.find((r) => r.expires_at && r.expires_at > now) ?? null;
  }

  // ── Revoke (accountant self-revokes) ──────────────────────────────────────

  async revokeRequest(
    clerkUserId: string,
    requestId: string,
  ): Promise<void> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    const request = await this.requestRepo.findOne({
      where: { id: requestId, firm_id: firm.id },
    });
    if (!request) throw new NotFoundException('Access request not found.');
    if (request.status !== AccessRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be revoked.');
    }

    request.status = AccessRequestStatus.EXPIRED;
    request.expires_at = new Date();
    await this.requestRepo.save(request);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calculateExpiry(
    durationType: string,
    customExpiresAt?: string,
  ): Date {
    const now = new Date();
    if (durationType === '90_days') {
      const d = new Date(now);
      d.setDate(d.getDate() + 90);
      return d;
    }
    if (durationType === 'year_end') {
      const nextMarch31 = new Date(now.getFullYear() + 1, 2, 31);
      return nextMarch31;
    }
    if (durationType === 'custom' && customExpiresAt) {
      return new Date(customExpiresAt);
    }
    const d = new Date(now);
    d.setDate(d.getDate() + 90);
    return d;
  }
}
