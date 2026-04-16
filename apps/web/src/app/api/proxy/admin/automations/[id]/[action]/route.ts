import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(API_URL + '/admin/automations/' + id + '/' + action, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
