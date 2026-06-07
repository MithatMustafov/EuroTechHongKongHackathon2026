import { Injectable } from '@nestjs/common';

interface CacheEntry {
  rate: number;
  expiresAt: number;
}

@Injectable()
export class FxService {
  private readonly cache = new Map<string, CacheEntry>();

  async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.rate;

    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (!res.ok) throw new Error(`FX API error: ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    const rate = data.rates[to];
    if (rate === undefined) throw new Error(`No rate found for ${from} → ${to}`);
    this.cache.set(key, { rate, expiresAt: Date.now() + 3_600_000 });
    return rate;
  }
}
