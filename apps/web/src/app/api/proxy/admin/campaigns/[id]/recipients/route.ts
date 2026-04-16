import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(API_URL + '/admin/campaigns/' + id + '/recipients', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
