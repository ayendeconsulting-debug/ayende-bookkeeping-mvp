import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(API_URL + '/admin/leads/' + id + '/enrich', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}