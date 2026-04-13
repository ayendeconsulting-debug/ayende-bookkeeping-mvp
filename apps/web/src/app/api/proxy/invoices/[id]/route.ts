import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

async function getHeaders(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  const clientBusinessId = request.cookies.get('client-business-id')?.value;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(clientBusinessId ? { 'X-Client-Business-Id': clientBusinessId } : {}),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = await getHeaders(request);
  const res = await fetch(`${API_URL}/invoices/${id}`, { headers, cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
