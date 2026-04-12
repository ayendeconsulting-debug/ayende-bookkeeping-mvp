'use client';
import { useEffect } from 'react';

interface ClientContextSetterProps {
  businessId: string;
  businessName: string;
}

/**
 * ClientContextSetter
 *
 * Rendered on the accountant client dashboard page.
 * Sets the `client-business-id` cookie when the accountant enters client
 * context, and clears it when they navigate away (component unmounts).
 *
 * The cookie is read by the server-side api() helper and forwarded as the
 * X-Client-Business-Id header to the NestJS ClientContextMiddleware.
 */
export function ClientContextSetter({ businessId, businessName }: ClientContextSetterProps) {
  useEffect(() => {
    // Set cookies — SameSite=Strict, no HttpOnly so JS can clear on unmount
    document.cookie = `client-business-id=${businessId}; path=/; SameSite=Strict; max-age=14400`;
    document.cookie = `client-business-name=${encodeURIComponent(businessName)}; path=/; SameSite=Strict; max-age=14400`;

  }, [businessId, businessName]);

  // Renders nothing — side-effect only
  return null;
}
