import { Injectable } from '@nestjs/common';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import {
  IMatcher,
  MatchContext,
  MatchResult,
  NO_MATCH,
} from '../interfaces/matcher.interface';

/**
 * Layer 1 - Priority 4: Pre-seeded vendor library.
 *
 * Matches against the global vendor_library table (2,000+ Canadian vendors).
 * Normalization: trim, lowercase, collapse whitespace — then checks if the
 * normalized description contains the vendor pattern. vendorLibrary is
 * pre-sorted by match_priority ASC in the MatchContext so first match wins.
 *
 * Confidence: taken directly from the library entry (typically 'medium';
 * 'high' only for unambiguous patterns set during seed).
 */
@Injectable()
export class VendorLibraryMatcher implements IMatcher {
  async match(tx: RawTransaction, ctx: MatchContext): Promise<MatchResult> {
    const normalized = VendorLibraryMatcher.normalize(tx.description);

    for (const vendor of ctx.vendorLibrary) {
      const pattern = VendorLibraryMatcher.normalize(vendor.vendor_pattern);
      if (!normalized.includes(pattern)) continue;

      const account = vendor.account_subtype
        ? ctx.accounts.find(
            (a) =>
              String(a.account_subtype) === vendor.account_subtype &&
              a.is_active,
          )
        : null;

      if (!account) continue;

      return {
        matched: true,
        source: 'rule_vendor',
        confidence: (vendor.confidence as 'high' | 'medium' | 'low') ?? 'medium',
        suggested_account_id: account.id,
        suggested_tax_code_id: null,
        suggested_is_personal: vendor.default_is_personal ?? null,
        reasoning: `Matched vendor library: "${vendor.vendor_display}"`,
      };
    }
    return NO_MATCH;
  }

  private static normalize(str: string): string {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}