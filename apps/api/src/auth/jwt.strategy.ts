import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ClerkUser } from './clerk-user.interface';
import { BusinessesService } from '../businesses/businesses.service';

/**
 * JwtStrategy
 *
 * Validates Clerk-issued JWTs using Clerk's public JWKS endpoint.
 * Resolves the Clerk org_id to a real business UUID from the DB.
 * Attaches ClerkUser (with real businessId UUID) to req.user.
 *
 * Required env var:
 *   CLERK_JWKS_URL — Clerk Dashboard → API Keys → Advanced → JWKS URL
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly businessesService: BusinessesService) {
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

  async validate(payload: Record<string, any>): Promise<ClerkUser> {
    const clerkOrgId = payload.org_id as string | undefined;

    if (!clerkOrgId) {
      throw new UnauthorizedException(
        'No organization context in token. Please select an organization in Tempo.',
      );
    }

    const business = await this.businessesService.findByClerkOrgId(clerkOrgId);

    if (!business) {
      throw new UnauthorizedException(
        'Business not provisioned. Please complete the sign-up flow.',
      );
    }

    return {
      userId:     payload.sub as string,
      businessId: business.id,
      role:       (payload.org_role as string) ?? null,
    };
  }
}
