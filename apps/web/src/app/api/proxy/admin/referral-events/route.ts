import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function GET(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const partnerId = req.nextUrl.searchParams.get('partnerId') || '';
  const eventType = req.nextUrl.searchParams.get('eventType') || '';
  let url = `${API_URL}/referrals/events`;
  const params = new URLSearchParams();
  if (partnerId) params.set('partnerId', partnerId);
  if (eventType) params.set('eventType', eventType);
  if (params.toString()) url += '?' + params.toString();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
