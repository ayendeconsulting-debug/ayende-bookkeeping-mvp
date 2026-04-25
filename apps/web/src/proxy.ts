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
  '/faq',
  '/features',
  '/who-its-for',
  '/legal/update',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unsubscribe(.*)',
  '/partner-dashboard(.*)',
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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ── Phase 26: Referral cookie handling ─────────────────────────────────────
  // When a user visits /sign-up?ref={code} and has no existing tempo_ref cookie,
  // set the cookie (first-touch attribution, FR-30) and log a click event.
  if (request.nextUrl.pathname.startsWith('/sign-up')) {
    const refCode = request.nextUrl.searchParams.get('ref');
    const existingRef = request.cookies.get('tempo_ref');
    if (refCode && !existingRef) {
      response.cookies.set('tempo_ref', refCode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60, // 90 days
        path: '/',
      });
      // NFR-3: Non-blocking click tracking — fire and forget
      fetch(`${API_URL}/referrals/track-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_code: refCode }),
      }).catch(() => {});
    }
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
