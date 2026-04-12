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
    document.cookie = `client-business-id=${businessId}; path=/; SameSite=Strict`;
    document.cookie = `client-business-name=${encodeURIComponent(businessName)}; path=/; SameSite=Strict`;
    return () => {
      // Clear cookies when accountant leaves client context
      document.cookie = 'client-business-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
      document.cookie = 'client-business-name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    };
  }, [businessId, businessName]);

  // Renders nothing — side-effect only
  return null;
}
