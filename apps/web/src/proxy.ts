import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

/**
 * Public routes - no authentication required.
 * Everything else is protected by Clerk.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/privacy',
  '/terms',
  '/terms-of-use',
  '/cookies',
  '/about',
  '/legal/update',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unsubscribe(.*)',
  '/api/public/leads',
  '/api/public/unsubscribe',
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
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.name) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // ── White-label subdomain branding ─────────────────────────────────────────
  const host = request.headers.get('host') ?? '';
  const slug = extractSubdomain(host);
  if (slug) {
    const branding = await fetchBranding(slug);
    if (branding) {
      requestHeaders.set('x-firm-branding', JSON.stringify(branding));
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
