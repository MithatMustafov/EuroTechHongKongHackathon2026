import { Injectable } from '@nestjs/common';
import { FxService } from '../fx/fx.service';
import { CostEstimate, RailName } from './rail.types';

interface FeeSpec {
  flat_fee_hkd: [number, number];
  fx_markup_pct: number;
  intermediary_usd: [number, number];
  settlement_time: string;
}

const RAIL_FEES: Record<RailName, FeeSpec> = {
  FPS:        { flat_fee_hkd: [0, 5],     fx_markup_pct: 0, intermediary_usd: [0, 0],   settlement_time: 'Instant (24/7)' },
  CHATS:      { flat_fee_hkd: [0, 200],   fx_markup_pct: 0, intermediary_usd: [0, 0],   settlement_time: 'Same day (business hours)' },
  CIPS:       { flat_fee_hkd: [75, 150],  fx_markup_pct: 2, intermediary_usd: [0, 0],   settlement_time: 'Same day to next day' },
  SWIFT:      { flat_fee_hkd: [100, 250], fx_markup_pct: 3, intermediary_usd: [30, 90], settlement_time: '1–5 business days' },
  STABLECOIN: { flat_fee_hkd: [0, 10],    fx_markup_pct: 0, intermediary_usd: [0, 0],   settlement_time: 'Near instant (24/7)' },
};

@Injectable()
export class CostEstimatorService {
  constructor(private readonly fxService: FxService) {}

  async estimate(amountHkd: number, rails: RailName[]): Promise<CostEstimate[]> {
    const usdToHkd = await this.fxService.getRate('USD', 'HKD').catch(() => 7.78);

    return rails.map(rail => {
      const fee = RAIL_FEES[rail];
      const fxCostHkd = amountHkd * (fee.fx_markup_pct / 100);
      const intermediaryMin = fee.intermediary_usd[0] * usdToHkd;
      const intermediaryMax = fee.intermediary_usd[1] * usdToHkd;

      return {
        rail,
        flat_fee_hkd: { min: fee.flat_fee_hkd[0], max: fee.flat_fee_hkd[1] },
        fx_cost_hkd: Math.round(fxCostHkd),
        intermediary_fees_hkd: {
          min: Math.round(intermediaryMin),
          max: Math.round(intermediaryMax),
        },
        total_estimated_hkd: {
          min: Math.round(fee.flat_fee_hkd[0] + fxCostHkd + intermediaryMin),
          max: Math.round(fee.flat_fee_hkd[1] + fxCostHkd + intermediaryMax),
        },
        fx_markup_pct: fee.fx_markup_pct,
        settlement_time: fee.settlement_time,
      };
    });
  }
}
