import { SetMetadata } from '@nestjs/common';

export const SKIP_LEGAL_CHECK_KEY = 'skipLegalCheck';

/**
 * Mark a controller or route handler to bypass the LegalAcceptanceGuard.
 *
 * Use on:
 *   - POST /legal/accept             — users must be able to submit acceptance even when blocked
 *   - GET  /legal/acceptance-status  — frontend needs this to know what to show
 *   - POST /billing/webhook          — already @Public() but added for clarity
 */
export const SkipLegalCheck = () => SetMetadata(SKIP_LEGAL_CHECK_KEY, true);
