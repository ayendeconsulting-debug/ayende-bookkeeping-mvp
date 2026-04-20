import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const res = await fetch(`${API_URL}/referrals/commissions/bulk-update`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
