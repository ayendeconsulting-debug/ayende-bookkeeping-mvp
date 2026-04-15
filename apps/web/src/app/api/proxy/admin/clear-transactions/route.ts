import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function DELETE(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get('businessId');
  if (!businessId) return NextResponse.json({ message: 'businessId required' }, { status: 400 });

  const res = await fetch(`${API_URL}/admin/clear-transactions?businessId=${businessId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
