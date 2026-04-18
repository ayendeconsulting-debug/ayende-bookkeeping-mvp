import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3005';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  try {
    const res = await fetch(
      `${API_URL}/unsubscribe?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
