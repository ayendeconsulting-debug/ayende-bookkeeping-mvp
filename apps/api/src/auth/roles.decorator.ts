import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Mark a route handler as requiring the 'admin' role.
 * Users with org:member (viewer) role will receive 403 Forbidden.
 *
 * Usage:
 *   @Roles('admin')
 *   @Post('codes')
 *   create(...) {}
 *
 * Routes without @Roles() are accessible by all authenticated users.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
