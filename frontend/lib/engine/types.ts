// Core domain types for the Payrouter decision engine.
// Shapes mirror the RailGuard brief (§8 extraction, §24 API output).

export type Currency = "HKD" | "RMB" | "USD" | "EUR";

export type RailId =
  | "FPS"
  | "CHATS_RTGS"
  | "CIPS_RMB"
  | "SWIFT"
  | "HKD_STABLECOIN"
  | "HOLD_OR_BLOCK";

/** A supplier invoice, after extraction (sample data or LLM-parsed). */
export interface Invoice {
  id: string;
  supplierName: string;
  supplierCountry: string; // e.g. "Hong Kong", "Mainland China", "Germany"
  invoiceNumber: string;
  amount: number;
  currency: Currency;
  goods: string;
  dueDate: string; // ISO date
  /** Bank account, FPS ID, IBAN, or wallet address the invoice asks to pay. */
  paymentDestination: string;
  /** Email domain the invoice/message was sent from. */
  senderDomain?: string;
  /** Free-text body used for language/pressure detection. */
  rawText?: string;
  /** Invoice explicitly states the payment details changed. */
  paymentDetailsChanged?: boolean;
  /** Supplier indicates they accept HKD stablecoin settlement. */
  acceptsStablecoin?: boolean;
}

/** Known-supplier profile used for verification (mock DB). */
export interface Supplier {
  name: string;
  country: string;
  expectedDomain: string;
  /** Payment destinations previously verified for this supplier. */
  verifiedDestinations: string[];
  /** Typical invoice amount (HKD-equivalent) to detect anomalies. */
  typicalAmount: number;
  /** Supplier has a verified stablecoin wallet on file. */
  verifiedStablecoinWallet: boolean;
  /** Per-supplier stablecoin settlement ceiling (HKD). */
  stablecoinLimit: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface FraudSignal {
  key: string;
  label: string;
  hit: boolean;
  weight: number;
}

export interface FraudResult {
  score: number; // 0–100
  level: RiskLevel;
  signals: FraudSignal[];
  /** Human-readable positive/negative reasons for the summary screen. */
  topReasons: string[];
}

export type CheckStatus = "passed" | "failed" | "review";

export interface SanctionsScreen {
  entity: string;
  hits: number;
  matches?: string[];
}

export interface ComplianceCheck {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** Extra data surfaced for specific checks (e.g. sanctions entity list). */
  meta?: {
    screens?: SanctionsScreen[];
    pepScreens?: SanctionsScreen[];
    source?: string;
  };
}

export interface ComplianceResult {
  status: CheckStatus; // overall
  checks: ComplianceCheck[];
  stablecoinEligible: boolean;
  stablecoinReason: string;
}

export type RailStatus = "recommended" | "available" | "not_suitable";

export interface RailCost {
  totalMin: number;
  totalMax: number;
  settlementTime: string;
  fxMarkupPct: number;
}

export interface RailOption {
  rail: RailId;
  label: string;
  status: RailStatus;
  reason: string;
  cost?: RailCost;
}

export type DecisionAction = "confirm_payment" | "hold_payment";

export interface Decision {
  invoice: Invoice;
  fraud: FraudResult;
  compliance: ComplianceResult;
  recommendedRail: RailId;
  rails: RailOption[];
  action: DecisionAction;
  /** Short plain-English explanation shown on the summary screen. */
  explanation: string;
}

export const RAIL_LABELS: Record<RailId, string> = {
  FPS: "FPS",
  CHATS_RTGS: "CHATS / RTGS",
  CIPS_RMB: "CIPS / RMB",
  SWIFT: "SWIFT",
  HKD_STABLECOIN: "HKD Stablecoin",
  HOLD_OR_BLOCK: "Hold / Review",
};
