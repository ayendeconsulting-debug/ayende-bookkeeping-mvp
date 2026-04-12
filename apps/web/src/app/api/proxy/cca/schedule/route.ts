import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function GET(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  const clientBusinessId = request.cookies.get('client-business-id')?.value;

  const res = await fetch(`${API_URL}/cca/schedule`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clientBusinessId ? { 'X-Client-Business-Id': clientBusinessId } : {}),
    },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
