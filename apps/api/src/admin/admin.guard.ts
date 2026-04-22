import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * AdminGuard – restricts endpoints to users with platform_role: 'admin'
 * set in their Clerk publicMetadata.
 *
 * The platform_role claim is injected into the JWT via the Clerk session
 * token template: { "platform_role": "{{user.public_metadata.platform_role}}" }
 *
 * To grant admin access: Clerk Dashboard → Users → Public Metadata →
 * { "platform_role": "admin" }
 *
 * Must run after JwtAuthGuard so that req.user is populated.
 * Usage: @UseGuards(AuthGuard('jwt'), AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const platformRole: string | undefined = request.user?.platform_role;

    if (platformRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
