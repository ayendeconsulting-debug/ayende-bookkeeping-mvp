import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AccountantShell } from '@/components/accountant-shell';

const API_URL = process.env.API_URL || 'http://localhost:3005';

async function getMyFirm(token: string) {
  try {
    const res = await fetch(`${API_URL}/firms/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, getToken } = await auth();

  if (!userId) redirect('/sign-in');

  const token = await getToken();
  if (!token) redirect('/sign-in');

  // Firm guard — users without a firm are sent to setup
  const firm = await getMyFirm(token);
  if (!firm) redirect('/accountant-setup');

  return (
    <AccountantShell firm={firm}>
      {children}
    </AccountantShell>
  );
}
