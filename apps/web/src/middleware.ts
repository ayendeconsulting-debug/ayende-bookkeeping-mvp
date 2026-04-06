import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

// Routes that are fully public — no Clerk auth required
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing(.*)',
  '/about(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/terms-of-use(.*)',
  '/cookies(.*)',
  '/legal(.*)',
  '/api/webhooks(.*)',
  '/billing/success(.*)',
  '/billing/cancel(.*)',
]);

// ── Subdomain extraction ──────────────────────────────────────────────────────

function extractSubdomain(host: string): string | null {
  const hostname = host.split(':')[0];
  // Production: smithco.gettempo.ca → smithco
  const prodMatch = hostname.match(/^([a-z0-9-]+)\.gettempo\.ca$/i);
  if (prodMatch) return prodMatch[1].toLowerCase();
  // Local dev: smithco.localhost → smithco
  const localMatch = hostname.match(/^([a-z0-9-]+)\.localhost$/i);
  if (localMatch) return localMatch[1].toLowerCase();
  return null;
}

// ── Branding fetch ────────────────────────────────────────────────────────────

async function fetchBranding(slug: string): Promise<{
  name: string | null;
  logo_url: string | null;
  brand_colour: string | null;
} | null> {
  try {
    const res = await fetch(`${API_URL}/firms/branding/${slug}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000), // 2s timeout — never block page load
    });
    if (!res.ok) return null;
    const data = await res.json();
    // If name is null, subdomain is not registered
    if (!data.name) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const host = req.headers.get('host') ?? '';
  const slug = extractSubdomain(host);

  const response = NextResponse.next();

  // Inject branding header if this is a subdomain request
  if (slug) {
    const branding = await fetchBranding(slug);
    if (branding) {
      response.headers.set('x-firm-branding', JSON.stringify(branding));
    }
  }

  // Propagate the original pathname for use in layout guards
  response.headers.set('x-pathname', req.nextUrl.pathname);

  return response;
});

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
