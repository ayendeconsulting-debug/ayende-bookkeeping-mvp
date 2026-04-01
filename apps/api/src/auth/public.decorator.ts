import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a controller or route handler as public.
 * Public endpoints bypass the global JwtAuthGuard entirely.
 *
 * Use on:
 *   - /health          (Railway healthcheck)
 *   - /plaid/webhook   (Plaid calls this directly, secured by signature verification)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
