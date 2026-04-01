import { redirect } from 'next/navigation';

/**
 * Root route — redirect authenticated users to dashboard.
 * Clerk middleware handles unauthenticated → /sign-in redirect.
 */
export default function RootPage() {
  redirect('/dashboard');
}
