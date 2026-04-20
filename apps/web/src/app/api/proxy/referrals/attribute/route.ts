import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function POST() {
  const cookieStore = await cookies();
  const tempoRef = cookieStore.get('tempo_ref')?.value;
  if (!tempoRef) {
    return NextResponse.json({ attributed: false, reason: 'no_cookie' });
  }

  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ attributed: false, reason: 'unauthenticated' });
  }

  try {
    const res = await fetch(`${API_URL}/referrals/attribute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ referral_code: tempoRef }),
    });
    const data = await res.json();

    // Clear the cookie regardless of attribution result
    // (prevents repeated calls on every page load)
    const response = NextResponse.json(data, { status: res.status });
    response.cookies.set('tempo_ref', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ attributed: false, reason: 'error' }, { status: 500 });
  }
}
