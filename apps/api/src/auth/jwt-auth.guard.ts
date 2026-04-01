import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * JwtAuthGuard
 *
 * Global guard applied to every route.
 * Routes decorated with @Public() bypass this guard entirely.
 *
 * Applied globally in app.module.ts via APP_GUARD provider.
 *
 * Public endpoints (decorated with @Public()):
 *   GET  /health         — Railway healthcheck
 *   POST /plaid/webhook  — Plaid webhook (secured by signature verification)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Invalid or missing authentication token. Please sign in to Ayende Bookkeeping App.',
        )
      );
    }
    return user;
  }
}
