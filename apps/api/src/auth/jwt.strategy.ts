import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ClerkUser } from './clerk-user.interface';

/**
 * JwtStrategy
 *
 * Validates Clerk-issued JWTs using Clerk's public JWKS endpoint.
 * On success, attaches ClerkUser to req.user for use in controllers.
 *
 * Required env var:
 *   CLERK_JWKS_URL — e.g. https://<your-clerk-instance>.clerk.accounts.dev/.well-known/jwks.json
 *   Find this in: Clerk Dashboard → API Keys → Advanced → JWKS URL
 *
 * Clerk JWT claims used:
 *   sub      → userId
 *   org_id   → businessId (Clerk Organization ID — maps 1:1 to businesses table)
 *   org_role → role       (org:admin = owner/accountant, org:member = viewer)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: process.env.CLERK_JWKS_URL!,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });
  }

  /**
   * Called after signature verification succeeds.
   * Return value is attached to req.user.
   */
  validate(payload: Record<string, any>): ClerkUser {
    const businessId = payload.org_id as string | undefined;

    if (!businessId) {
      throw new UnauthorizedException(
        'No organization context in token. Please select an organization in the Ayende Bookkeeping App.',
      );
    }

    return {
      userId: payload.sub as string,
      businessId,
      role: (payload.org_role as string) ?? null,
    };
  }
}
