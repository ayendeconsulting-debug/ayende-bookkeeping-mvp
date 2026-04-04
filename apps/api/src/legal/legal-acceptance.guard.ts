import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { SKIP_LEGAL_CHECK_KEY } from './skip-legal-check.decorator';
import { LegalService } from './legal.service';

// HTTP 451 — Unavailable For Legal Reasons (not available in older NestJS HttpStatus)
const HTTP_451 = 451;

/**
 * LegalAcceptanceGuard
 *
 * Runs after JwtAuthGuard and RolesGuard.
 * Returns HTTP 451 (Unavailable For Legal Reasons) if the authenticated user
 * has not accepted the current version of any legal document.
 *
 * Exempt routes:
 *   - Any route decorated with @Public()         — unauthenticated, no user to check
 *   - Any route decorated with @SkipLegalCheck() — legal/accept, legal/acceptance-status
 *
 * Version check is an in-memory comparison inside LegalService.getAcceptanceStatus()
 * against LEGAL_VERSIONS constants — no extra DB query beyond what already exists.
 */
@Injectable()
export class LegalAcceptanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly legalService: LegalService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip for @Public() routes — no authenticated user
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip for @SkipLegalCheck() routes
    const skipLegal = this.reflector.getAllAndOverride<boolean>(SKIP_LEGAL_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipLegal) return true;

    // Extract user from request — populated by JwtAuthGuard which runs first
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined =
      request.user?.sub ?? request.user?.userId ?? request.user?.id;

    // If no user at this point, let JwtAuthGuard handle it — don't double-block
    if (!userId) return true;

    // Check legal acceptance status — in-memory version comparison
    const status = await this.legalService.getAcceptanceStatus(userId);

    if (status.requires_reacceptance) {
      throw new HttpException(
        {
          statusCode: HTTP_451,
          message: 'Legal re-acceptance required',
          requires_reacceptance: true,
          documents: status.documents.filter((d) => !d.is_current),
        },
        HTTP_451,
      );
    }

    return true;
  }
}
