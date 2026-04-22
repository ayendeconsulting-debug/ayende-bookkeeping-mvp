/**
 * Shape of req.user after JwtStrategy.validate() runs.
 *
 * Clerk JWT claims used:
 *   sub            → userId        (Clerk user ID, e.g. "user_xxx")
 *   org_id         → businessId    (Clerk org ID, maps 1:1 to businesses table)
 *   org_role       → role          (admin = owner/accountant, member = viewer)
 *   platform_role  → platformRole  (set via Clerk publicMetadata — 'admin' for platform admins)
 */
export interface ClerkUser {
  userId:        string;
  businessId:    string;
  role:          string | null;
  platform_role: string | null;
}

/**
 * Extend Express Request to include typed req.user
 */
declare global {
  namespace Express {
    interface User extends ClerkUser {}
  }
}
