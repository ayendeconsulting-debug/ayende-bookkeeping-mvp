import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const body = await request.json();
  const res = await fetch(API_URL + '/admin/leads/' + id, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(API_URL + '/admin/leads/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
