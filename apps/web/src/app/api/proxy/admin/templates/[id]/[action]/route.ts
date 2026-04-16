import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  let body: unknown = {};
  try { body = await request.json(); } catch { /* no body */ }
  const res = await fetch(${API_URL}/admin/templates//, {
    method: 'POST',
    headers: { Authorization: Bearer , 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}