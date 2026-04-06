import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import { FirmStaff } from '../entities/firm-staff.entity';

/**
 * ClientContextMiddleware
 *
 * Reads the X-Client-Business-Id header sent by the Next.js frontend when an
 * accountant is operating in client context mode.
 *
 * When present:
 * 1. Verifies the requesting Clerk user is an active staff member of a firm.
 * 2. Verifies that firm has an active firm_client record for the requested businessId.
 * 3. Overwrites req.user.businessId with the client businessId so all downstream
 *    controllers and services operate on the client's data transparently.
 *
 * When absent: no-op — normal businessId from JWT is used.
 *
 * This middleware runs AFTER JwtAuthGuard has validated the token and
 * populated req.user, so req.user.userId is always available here.
 */
@Injectable()
export class ClientContextMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
    @InjectRepository(FirmStaff)
    private readonly firmStaffRepo: Repository<FirmStaff>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientBusinessId = req.headers['x-client-business-id'] as string | undefined;

    // No header — operate on user's own business context
    if (!clientBusinessId) {
      return next();
    }

    // req.user is populated by JwtAuthGuard before this middleware runs
    const clerkUserId = (req as any).user?.userId;
    if (!clerkUserId) {
      return next();
    }

    // ── Verify requesting user is an active firm staff member ────────────────
    const firmStaff = await this.firmStaffRepo.findOne({
      where: { clerk_user_id: clerkUserId },
    });

    if (!firmStaff) {
      throw new ForbiddenException(
        'You are not a member of any accountant firm.',
      );
    }

    // ── Verify the firm has an active client relationship for this business ──
    const firmClient = await this.firmClientRepo.findOne({
      where: {
        firm_id: firmStaff.firm_id,
        business_id: clientBusinessId,
        status: FirmClientStatus.ACTIVE,
      },
    });

    if (!firmClient) {
      throw new ForbiddenException(
        'This business is not an active client of your firm.',
      );
    }

    // ── Overwrite businessId — all downstream services use client context ────
    (req as any).user.businessId = clientBusinessId;

    next();
  }
}
