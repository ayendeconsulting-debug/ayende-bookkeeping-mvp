import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Business } from '../entities/business.entity';

interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — satisfies NFR-27
const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'CHF', 'JPY', 'MXN'];

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  // In-memory cache keyed by base currency
  private readonly rateCache = new Map<string, RateCache>();

  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  // ── Get exchange rates (cached 24h) ───────────────────────────────────────

  async getRates(baseCurrency: string): Promise<Record<string, number>> {
    const cached = this.rateCache.get(baseCurrency);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      this.logger.debug(`Rates for ${baseCurrency} served from cache`);
      return cached.rates;
    }

    return this.fetchAndCache(baseCurrency);
  }

  // ── Convert amount between currencies ─────────────────────────────────────

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    // Fetch rates relative to USD (OXR free tier uses USD as base)
    const rates = await this.fetchAndCache('USD');

    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      throw new BadRequestException(
        `Unsupported currency pair: ${fromCurrency} → ${toCurrency}`,
      );
    }

    // Convert via USD as intermediate: amount → USD → target
    const amountInUsd = amount / fromRate;
    const result = amountInUsd * toRate;
    return parseFloat(result.toFixed(2));
  }

  // ── Convert pending foreign transactions for a business ───────────────────

  async convertPendingTransactions(businessId: string): Promise<number> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) return 0;

    const baseCurrency = business.currency_code ?? 'CAD';

    // Find raw transactions with a foreign currency that haven't been converted yet
    // Condition: currency_code IS NOT NULL AND original_amount IS NULL
    const pending = await this.rawTxRepo.find({
      where: {
        business_id: businessId,
        original_amount: IsNull(),
      },
    });

    // Filter to those that have a currency_code differing from base
    const foreign = pending.filter(
      (tx) => tx.currency_code && tx.currency_code !== baseCurrency,
    );

    if (foreign.length === 0) return 0;

    let converted = 0;
    for (const tx of foreign) {
      try {
        const convertedAmount = await this.convert(
          Number(tx.amount),
          tx.currency_code!,
          baseCurrency,
        );

        await this.rawTxRepo.update(tx.id, {
          original_amount: Number(tx.amount),
          amount: convertedAmount,
        });

        converted++;
      } catch (err) {
        this.logger.warn(
          `Could not convert tx ${tx.id} (${tx.currency_code}): ${err.message}`,
        );
      }
    }

    if (converted > 0) {
      this.logger.log(`Converted ${converted} foreign currency transactions for business ${businessId}`);
    }

    return converted;
  }

  // ── Manual rate override for a specific transaction ───────────────────────

  async overrideTransactionRate(
    businessId: string,
    transactionId: string,
    manualRate: number,
  ): Promise<RawTransaction> {
    const tx = await this.rawTxRepo.findOne({
      where: { id: transactionId, business_id: businessId },
    });

    if (!tx) throw new NotFoundException(`Transaction ${transactionId} not found`);
    if (!tx.currency_code) {
      throw new BadRequestException('This transaction has no foreign currency — no conversion needed.');
    }

    const originalAmount = Number(tx.original_amount ?? tx.amount);
    const convertedAmount = parseFloat((originalAmount * manualRate).toFixed(2));

    await this.rawTxRepo.update(transactionId, {
      original_amount: originalAmount,
      amount: convertedAmount,
    });

    return this.rawTxRepo.findOne({ where: { id: transactionId } }) as Promise<RawTransaction>;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async fetchAndCache(baseCurrency: string): Promise<Record<string, number>> {
    const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;

    if (!appId) {
      this.logger.warn('OPEN_EXCHANGE_RATES_APP_ID not set — using fallback rates');
      return this.getFallbackRates();
    }

    try {
      const res = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD&symbols=${SUPPORTED_CURRENCIES.join(',')}`,
      );

      if (!res.ok) {
        throw new Error(`OXR API returned ${res.status}`);
      }

      const data = await res.json() as { rates: Record<string, number> };
      const rates = data.rates;

      // If base is not USD, convert all rates relative to the requested base
      let finalRates = rates;
      if (baseCurrency !== 'USD') {
        const baseRate = rates[baseCurrency];
        if (!baseRate) throw new Error(`Base currency ${baseCurrency} not in OXR response`);
        finalRates = Object.fromEntries(
          Object.entries(rates).map(([currency, rate]) => [currency, rate / baseRate]),
        );
        finalRates[baseCurrency] = 1; // base = 1
      }

      this.rateCache.set(baseCurrency, {
        base: baseCurrency,
        rates: finalRates,
        fetchedAt: Date.now(),
      });

      this.logger.log(`Exchange rates fetched and cached for base ${baseCurrency}`);
      return finalRates;
    } catch (err) {
      this.logger.error(`Failed to fetch exchange rates: ${err.message}`);
      return this.getFallbackRates();
    }
  }

  // Fallback rates relative to USD — used when API key not configured
  private getFallbackRates(): Record<string, number> {
    return {
      USD: 1,
      CAD: 1.36,
      EUR: 0.92,
      GBP: 0.79,
      AUD: 1.53,
      CHF: 0.88,
      JPY: 149.5,
      MXN: 17.1,
    };
  }

  // Expose supported currencies for frontend
  getSupportedCurrencies(): string[] {
    return SUPPORTED_CURRENCIES;
  }
}
