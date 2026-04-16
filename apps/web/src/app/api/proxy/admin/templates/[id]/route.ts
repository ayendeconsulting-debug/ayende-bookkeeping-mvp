import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const body = await request.json();
  const res = await fetch(${API_URL}/admin/templates/, {
    method: 'PATCH',
    headers: { Authorization: Bearer , 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(${API_URL}/admin/templates/, {
    method: 'DELETE',
    headers: { Authorization: Bearer  },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}