import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FirmsService } from './firms.service';

interface BrandingCache {
  data: { name: string; logo_url: string | null; brand_colour: string | null } | null;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class SubdomainMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SubdomainMiddleware.name);
  private readonly cache = new Map<string, BrandingCache>();

  constructor(private readonly firmsService: FirmsService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const host = req.headers.host ?? '';

      // Only process subdomain requests — skip bare domain and localhost
      const slug = this.extractSubdomain(host);
      if (!slug) {
        next();
        return;
      }

      const branding = await this.getWithCache(slug);
      if (branding) {
        // Inject branding as a response header — consumed by Next.js middleware
        res.setHeader('X-Firm-Branding', JSON.stringify(branding));
        this.logger.debug(`Subdomain "${slug}" → firm "${branding.name}"`);
      }
    } catch (err) {
      // Never block a request due to branding lookup failure
      this.logger.error(`SubdomainMiddleware error: ${(err as Error).message}`);
    }

    next();
  }

  // ── Subdomain extraction ───────────────────────────────────────────────────

  private extractSubdomain(host: string): string | null {
    // Strip port if present (e.g. localhost:3005)
    const hostname = host.split(':')[0];

    // Match subdomains of gettempo.ca — e.g. smithco.gettempo.ca → smithco
    const match = hostname.match(/^([a-z0-9-]+)\.gettempo\.ca$/i);
    if (match) return match[1].toLowerCase();

    // Local dev support — e.g. smithco.localhost
    const localMatch = hostname.match(/^([a-z0-9-]+)\.localhost$/i);
    if (localMatch) return localMatch[1].toLowerCase();

    return null;
  }

  // ── In-memory cache with 5-minute TTL ─────────────────────────────────────

  private async getWithCache(
    slug: string,
  ): Promise<{ name: string; logo_url: string | null; brand_colour: string | null } | null> {
    const now = Date.now();
    const cached = this.cache.get(slug);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const data = await this.firmsService.getBranding(slug);
    this.cache.set(slug, { data, expiresAt: now + TTL_MS });
    return data;
  }
}
