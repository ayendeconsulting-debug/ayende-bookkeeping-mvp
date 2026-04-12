import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL || 'http://localhost:3005';
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const res = await fetch(`${API_URL}/ai/anomalies`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.json({ flags: [], summary: '' }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}