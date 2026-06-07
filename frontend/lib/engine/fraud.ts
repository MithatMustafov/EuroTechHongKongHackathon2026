import type { FraudResult, FraudSignal, Invoice, RiskLevel, Supplier } from "./types";
import { deriveSignals } from "./signals";

const SCORE_HOLD      = 86;  // §16 — auto-hold above this
const SCORE_HIGH      = 60;
const SCORE_MEDIUM    = 30;
const SCORE_MAX       = 100;

// Additive weights from the brief (§15).
const WEIGHTS = {
  newSupplier: 15,
  amountUnusual: 15,
  paymentDestinationChanged: 30,
  walletOrAccountNotVerified: 25,
  urgencyDetected: 20,
  pressureLanguageDetected: 15,
  emailDomainMismatch: 25,
  walletOnRiskList: 40,
} as const;

const LABELS: Record<keyof typeof WEIGHTS, string> = {
  newSupplier: "New / unrecognised supplier",
  amountUnusual: "Amount unusual for this supplier",
  paymentDestinationChanged: "Payment destination changed",
  walletOrAccountNotVerified: "Beneficiary account/wallet not verified",
  urgencyDetected: "Urgency language detected",
  pressureLanguageDetected: "Pressure language detected",
  emailDomainMismatch: "Supplier email domain mismatch",
  walletOnRiskList: "Destination on risk list",
};

function levelFor(score: number): RiskLevel {
  if (score <= SCORE_MEDIUM) return "low";
  if (score <= SCORE_HIGH)   return "medium";
  if (score <  SCORE_HOLD)   return "high";
  return "critical";
}

export function scoreFraud(invoice: Invoice, supplier?: Supplier): FraudResult {
  const s = deriveSignals(invoice, supplier);

  const signals: FraudSignal[] = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map(
    (key) => ({
      key,
      label: LABELS[key],
      hit: s[key],
      weight: WEIGHTS[key],
    }),
  );

  let score = signals.reduce((sum, sig) => (sig.hit ? sum + sig.weight : sum), 0);
  // A sanctions hit is an automatic maximum.
  if (s.sanctionsHit) score = SCORE_MAX;
  score = Math.min(score, SCORE_MAX);

  const level = levelFor(score);

  const hitReasons = signals.filter((sig) => sig.hit).map((sig) => sig.label);
  const topReasons =
    hitReasons.length > 0
      ? hitReasons.slice(0, 4)
      : [
          "Supplier matches known profile",
          "Payment details unchanged",
          "No urgency or pressure language detected",
          "Amount within expected range",
        ];

  return { score, level, signals, topReasons };
}
