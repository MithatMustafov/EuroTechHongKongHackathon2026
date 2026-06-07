import { Injectable, Logger } from '@nestjs/common';
import { THRESHOLDS } from '../../domain/shared/constants/thresholds';

interface CacheEntry {
  rate: number;
  expiresAt: number;
}

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`  FX cache hit  ${from}→${to}  rate=${cached.rate}`);
      return cached.rate;
    }

    this.logger.log(`  FX fetch  ${from}→${to}  source=open.er-api.com`);
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (!res.ok) throw new Error(`FX API error: ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    const rate = data.rates[to];
    if (rate === undefined) throw new Error(`No rate found for ${from} → ${to}`);
    this.cache.set(key, { rate, expiresAt: Date.now() + THRESHOLDS.FX_CACHE_TTL_MS });
    this.logger.log(`  FX fetched  ${from}→${to}  rate=${rate}  cached=1h`);
    return rate;
  }
}
