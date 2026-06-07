export type RailName = 'FPS' | 'CHATS_RTGS' | 'CIPS' | 'SWIFT' | 'STABLECOIN';

export interface RailAlternative {
  rail: RailName;
  eligible: boolean;
  reason?: string;
}

export interface RailRecommendation {
  recommended_rail: RailName | 'BLOCKED' | 'HOLD';
  reason: string;
  requested_method_match: boolean;
  alternatives: RailAlternative[];
}

export interface CostEstimate {
  rail: RailName;
  flat_fee_hkd: { min: number; max: number };
  fx_cost_hkd: number;
  intermediary_fees_hkd: { min: number; max: number };
  total_estimated_hkd: { min: number; max: number };
  fx_markup_pct: number;
  settlement_time: string;
}
