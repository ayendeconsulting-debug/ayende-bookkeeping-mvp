import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * AdminGuard — restricts endpoints to Clerk user IDs listed in the
 * ADMIN_USER_IDS environment variable (comma-separated).
 *
 * Must run after JwtAuthGuard so that req.user is populated.
 * Usage: @UseGuards(JwtAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Admin access required');
    }

    const adminIds = (process.env.ADMIN_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!adminIds.includes(userId)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
