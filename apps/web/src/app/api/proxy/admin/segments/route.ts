import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function GET() {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(API_URL + '/admin/segments', {
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
