import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

/**
 * POST /api/public/leads
 * Public — no Clerk auth required.
 * Forwards lead form submissions to the NestJS /public/leads endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(API_URL + '/public/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Service unavailable — please try again.' },
      { status: 503 },
    );
  }
}
