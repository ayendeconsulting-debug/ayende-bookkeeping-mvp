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
 * 1. Decodes the Clerk JWT from the Authorization header to extract the userId.
 *    (Full cryptographic verification is handled by JwtAuthGuard — here we only
 *    need the sub claim to identify the actor. We never trust data that hasn't
 *    been verified by the guard downstream.)
 * 2. Verifies the requesting Clerk user is an active staff member of a firm.
 * 3. Verifies that firm has an active firm_client record for the requested businessId.
 * 4. Overwrites req.user.businessId with the client businessId so all downstream
 *    controllers and services operate on the client's data transparently.
 *
 * When absent: no-op — normal businessId from JWT is used.
 *
 * NOTE: This middleware runs BEFORE JwtAuthGuard. We decode (not verify) the JWT
 * payload to get the Clerk userId early. Full verification happens in the guard.
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

    // ── Extract Clerk userId from JWT payload (decode only, not verify) ──────
    // JwtAuthGuard handles full cryptographic verification later in the pipeline.
    const clerkUserId = this.extractClerkUserIdFromJwt(req);
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
    // req.user may not be populated yet (guard runs later), so we store the
    // client context in a custom property that JwtStrategy.validate() will
    // apply when populating req.user.
    (req as any).__clientBusinessId = clientBusinessId;

    next();
  }

  /**
   * Decodes (does not verify) the JWT payload from the Authorization header.
   * Returns the Clerk user ID (sub claim) or null if not present/decodable.
   */
  private extractClerkUserIdFromJwt(req: Request): string | null {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

      const token = authHeader.slice(7);
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Base64url decode the payload (second part)
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      // Clerk sets the user ID as the 'sub' claim
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
