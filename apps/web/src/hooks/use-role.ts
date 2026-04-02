'use client';

import { useAuth } from '@clerk/nextjs';

/**
 * Returns the current user's Clerk org role.
 * Clerk emits 'org:admin' for owner/accountant and 'org:member' for viewer.
 * Returns null while auth is loading or if no org context exists.
 */
export function useRole(): string | null {
  const { orgRole } = useAuth();
  return orgRole ?? null;
}

/**
 * Returns true if the current user has the admin role (org:admin).
 * Owner and accountant users are mapped to org:admin in Clerk.
 */
export function useIsAdmin(): boolean {
  const role = useRole();
  return role?.includes('admin') ?? false;
}

/**
 * Returns true if the current user is a viewer (org:member).
 * Viewers can read all data but cannot create, edit, or delete.
 */
export function useIsViewer(): boolean {
  const role = useRole();
  if (role === null) return false;
  return !role.includes('admin');
}
