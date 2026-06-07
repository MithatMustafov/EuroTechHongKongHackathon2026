export type PaymentRail =
  | 'FPS'
  | 'CHATS_RTGS'
  | 'CIPS'
  | 'SWIFT'
  | 'STABLECOIN'
  | 'BANK_TRANSFER'
  | 'NONE';

export type RailOptionStatus =
  | 'RECOMMENDED'
  | 'AVAILABLE'
  | 'NOT_SUITABLE'
  | 'BLOCKED';

export type RailOption = {
  rail: PaymentRail;
  status: RailOptionStatus;
  reason: string;
};

export type RailDecision = {
  recommended_rail: PaymentRail;
  summary: string;
  rail_options: RailOption[];
};
