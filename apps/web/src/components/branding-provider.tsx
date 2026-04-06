import { headers } from 'next/headers';

interface Branding {
  name: string | null;
  logo_url: string | null;
  brand_colour: string | null;
}

/**
 * Server component — reads x-firm-branding header injected by middleware,
 * injects CSS vars into the document for white-label subdomain styling.
 *
 * CSS vars injected:
 *   --brand-primary   (hex colour, e.g. #2C4A8C)
 *   --brand-name      (firm name string)
 *
 * Falls back to Tempo defaults if no branding header present.
 */
export async function BrandingProvider({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const brandingHeader = headersList.get('x-firm-branding');

  let branding: Branding | null = null;
  if (brandingHeader) {
    try {
      branding = JSON.parse(brandingHeader) as Branding;
    } catch {
      // Malformed header — ignore
    }
  }

  // Only inject CSS vars if we have a valid firm branding
  const cssVars = branding?.brand_colour
    ? `
      :root {
        --brand-primary: ${branding.brand_colour};
      }
    `.trim()
    : null;

  return (
    <>
      {cssVars && (
        <style
          dangerouslySetInnerHTML={{ __html: cssVars }}
        />
      )}
      {children}
    </>
  );
}
