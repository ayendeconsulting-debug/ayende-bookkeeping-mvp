/**
 * Legal document version constants — API side.
 * Must stay in sync with apps/web/src/lib/legal-versions.ts.
 * Bump a version here when the document content changes.
 * Users who have not accepted the new version will be prompted to re-accept on next login.
 */

export const LEGAL_VERSIONS = {
  terms_of_service: '1.1.0',
  terms_of_use:     '1.0.0',
  privacy_policy:   '1.0.0',
  cookie_policy:    '1.0.0',
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const ALL_DOCUMENT_TYPES: LegalDocumentType[] = [
  'terms_of_service',
  'terms_of_use',
  'privacy_policy',
  'cookie_policy',
];
