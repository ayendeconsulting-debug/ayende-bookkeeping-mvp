import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { AdminClient } from './admin-client';

async function checkAdminAccess(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'}/admin/check`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export default async function AdminPage() {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) redirect('/dashboard');

  const isAdmin = await checkAdminAccess(token);
  if (!isAdmin) redirect('/dashboard');

  return <AdminClient />;
}
