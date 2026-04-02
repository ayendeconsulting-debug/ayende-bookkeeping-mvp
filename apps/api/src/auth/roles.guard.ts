import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * RolesGuard
 *
 * Applied globally as a second APP_GUARD (runs after JwtAuthGuard).
 * Checks req.user.role against the @Roles() decorator on the handler.
 *
 * Role mapping (from Clerk JWT org_role claim):
 *   org:admin  → can access all endpoints including @Roles('admin')
 *   org:member → viewer — blocked on @Roles('admin') endpoints (403)
 *
 * Routes with no @Roles() decorator are accessible by all authenticated users.
 * Routes with @Public() bypass this guard entirely.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @Public() routes bypass role check entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // No @Roles() on this handler — accessible by any authenticated user
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Clerk emits org_role as 'org:admin' or 'org:member'
    // We check if the role contains 'admin' to be forward-compatible
    const userRole: string = user.role ?? '';
    const isAdmin = userRole.includes('admin');

    if (requiredRoles.includes('admin') && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to perform this action. Owner or accountant role required.',
      );
    }

    return true;
  }
}
