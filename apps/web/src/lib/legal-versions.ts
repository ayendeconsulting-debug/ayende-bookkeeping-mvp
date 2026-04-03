/**
 * Legal document version constants.
 * Bump a version string here when the document content changes.
 * The backend LegalAcceptanceGuard reads these to determine if re-acceptance is required.
 */

export const LEGAL_VERSIONS = {
  terms_of_service: '1.0.0',
  terms_of_use:     '1.0.0',
  privacy_policy:   '1.0.0',
  cookie_policy:    '1.0.0',
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;
