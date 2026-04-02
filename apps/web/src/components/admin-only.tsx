'use client';

import { useIsAdmin } from '@/hooks/use-role';

interface AdminOnlyProps {
  children: React.ReactNode;
  /**
   * Optional fallback rendered for viewers instead of children.
   * Defaults to null (renders nothing).
   */
  fallback?: React.ReactNode;
}

/**
 * AdminOnly
 *
 * Renders children only for users with the admin role (org:admin).
 * Renders the fallback (or nothing) for viewers (org:member).
 *
 * Use this to hide write actions from viewer-role users.
 * The API also enforces the same restriction server-side (403 Forbidden).
 *
 * @example
 * // Hide a button entirely for viewers
 * <AdminOnly>
 *   <Button onClick={handleCreate}>New Account</Button>
 * </AdminOnly>
 *
 * @example
 * // Show a disabled button as fallback
 * <AdminOnly fallback={<Button disabled>New Account</Button>}>
 *   <Button onClick={handleCreate}>New Account</Button>
 * </AdminOnly>
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
