import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const res = await fetch(`${API_URL}/referrals/partners/${id}/send-link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
