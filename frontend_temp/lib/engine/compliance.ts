import type {
  CheckStatus,
  ComplianceCheck,
  ComplianceResult,
  Invoice,
  Supplier,
} from "./types";
import { deriveSignals } from "./signals";
import { hasRestrictedGoods, SANCTIONED_COUNTRIES } from "@/lib/data/sanctions_mock";

// SME policy ceiling (HKD-equivalent) above which payments need approval.
const POLICY_LIMIT = 1_000_000;

function overall(checks: ComplianceCheck[]): CheckStatus {
  if (checks.some((c) => c.status === "failed")) return "failed";
  if (checks.some((c) => c.status === "review")) return "review";
  return "passed";
}

export function checkCompliance(invoice: Invoice, supplier?: Supplier): ComplianceResult {
  const s = deriveSignals(invoice, supplier);
  const sup = s.supplier;

  const jurisdictionSanctioned = SANCTIONED_COUNTRIES.some((c) =>
    invoice.supplierCountry.toLowerCase().includes(c.toLowerCase()),
  );

  const checks: ComplianceCheck[] = [
    {
      key: "payer_kyc",
      label: "Payer KYC",
      status: "passed",
      detail: "SME payer identity verified",
    },
    {
      key: "supplier_kyb",
      label: "Supplier KYB",
      status: sup ? "passed" : "review",
      detail: sup ? "Supplier business profile verified" : "Unrecognised supplier — verify business",
    },
    {
      key: "sanctions",
      label: "Sanctions screening",
      status: s.sanctionsHit ? "failed" : "passed",
      detail: s.sanctionsHit ? "Match on sanctions / risk list" : "No sanctions match",
    },
    {
      key: "jurisdiction",
      label: "Jurisdiction",
      status: jurisdictionSanctioned ? "failed" : "passed",
      detail: jurisdictionSanctioned
        ? `${invoice.supplierCountry} is restricted`
        : `${invoice.supplierCountry} allowed`,
    },
    {
      key: "goods_category",
      label: "Goods category",
      status: hasRestrictedGoods(invoice.goods) ? "review" : "passed",
      detail: hasRestrictedGoods(invoice.goods)
        ? "Restricted / dual-use goods — enhanced review"
        : "Goods category allowed",
    },
    {
      key: "amount_limit",
      label: "Amount & policy limit",
      status: invoice.amount > POLICY_LIMIT ? "review" : "passed",
      detail:
        invoice.amount > POLICY_LIMIT
          ? "Amount exceeds SME policy limit — approval required"
          : "Amount within policy limit",
    },
  ];

  const status = overall(checks);

  // Compliance-side view of stablecoin eligibility (the brief's §10.7 gate,
  // minus the fraud-score condition which the rail engine applies).
  const eligibilityFailures: string[] = [];
  if (!invoice.acceptsStablecoin) eligibilityFailures.push("supplier does not accept stablecoin");
  if (!sup?.verifiedStablecoinWallet) eligibilityFailures.push("no verified stablecoin wallet");
  if (invoice.currency !== "HKD") eligibilityFailures.push("invoice not HKD-denominated");
  if (sup && invoice.amount > sup.stablecoinLimit)
    eligibilityFailures.push("amount above stablecoin policy limit");
  if (status === "failed") eligibilityFailures.push("compliance checks did not pass");
  if (hasRestrictedGoods(invoice.goods)) eligibilityFailures.push("goods require enhanced review");

  const stablecoinEligible = eligibilityFailures.length === 0;
  const stablecoinReason = stablecoinEligible
    ? "Verified supplier wallet, HKD invoice, within policy, compliance passed"
    : `Not eligible: ${eligibilityFailures[0]}`;

  return { status, checks, stablecoinEligible, stablecoinReason };
}
