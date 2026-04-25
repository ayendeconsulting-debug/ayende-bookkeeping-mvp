import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * DemoGuard — restricts endpoints to users with platform_role: 'demo' or 'admin'
 * set in their Clerk publicMetadata.
 *
 * Demo users can access demo org workflows but cannot access AdminGuard-protected
 * endpoints. This allows external parties (e.g. marketing agencies) to interact
 * with demo orgs without any platform admin exposure.
 *
 * To grant demo access: Clerk Dashboard → Users → Public Metadata →
 * { "platform_role": "demo" }
 *
 * Must run after JwtAuthGuard so that req.user is populated.
 * Usage: @UseGuards(AuthGuard('jwt'), DemoGuard)
 */
@Injectable()
export class DemoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const platformRole: string | undefined = request.user?.platform_role;

    if (platformRole !== 'admin' && platformRole !== 'demo') {
      throw new ForbiddenException('Demo access required');
    }
    return true;
  }
}
