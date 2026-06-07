import type {
  ComplianceResult,
  FraudResult,
  Invoice,
  RailId,
  RailOption,
  Supplier,
} from "./types";
import { RAIL_LABELS } from "./types";

function isHK(country: string): boolean {
  return country.toLowerCase().includes("hong kong");
}
function isMainland(country: string): boolean {
  const c = country.toLowerCase();
  return c.includes("china") && !c.includes("hong kong");
}
function sanctionsFailed(compliance: ComplianceResult): boolean {
  return compliance.checks.some((c) => c.key === "sanctions" && c.status === "failed");
}

/** Decision tree from the brief (§16). */
export function recommendRail(
  invoice: Invoice,
  fraud: FraudResult,
  compliance: ComplianceResult,
  supplier?: Supplier,
): RailId {
  if (fraud.score >= 86 || sanctionsFailed(compliance)) return "HOLD_OR_BLOCK";

  if (isHK(invoice.supplierCountry) && invoice.amount < 100000 && invoice.currency === "HKD")
    return "FPS";

  if (isHK(invoice.supplierCountry) && invoice.amount >= 100000) return "CHATS_RTGS";

  if (isMainland(invoice.supplierCountry) && invoice.currency === "RMB") return "CIPS_RMB";

  if (
    supplier?.verifiedStablecoinWallet &&
    invoice.currency === "HKD" &&
    fraud.score <= 30 &&
    compliance.status === "passed" &&
    invoice.amount <= supplier.stablecoinLimit &&
    invoice.acceptsStablecoin
  ) {
    return "HKD_STABLECOIN";
  }

  return "SWIFT";
}

/** Build the full set of rail cards with per-rail status + reason. */
export function buildRailOptions(
  invoice: Invoice,
  fraud: FraudResult,
  compliance: ComplianceResult,
  supplier: Supplier | undefined,
  recommended: RailId,
): RailOption[] {
  const hk = isHK(invoice.supplierCountry);
  const mainland = isMainland(invoice.supplierCountry);

  const reasons: Record<Exclude<RailId, "HOLD_OR_BLOCK">, string> = {
    FPS: hk
      ? "Local Hong Kong recipient, instant HKD settlement"
      : "Supplier is not a local Hong Kong recipient",
    CHATS_RTGS: hk
      ? "Domestic high-value real-time settlement"
      : "Not a domestic high-value settlement",
    CIPS_RMB: mainland
      ? "Mainland supplier, cross-border RMB settlement"
      : "Supplier is not a Mainland RMB recipient",
    SWIFT: "Traditional cross-border bank transfer fallback",
    HKD_STABLECOIN: compliance.stablecoinEligible
      ? "Verified wallet, low risk, fast settlement"
      : compliance.stablecoinReason,
  };

  const rails: Exclude<RailId, "HOLD_OR_BLOCK">[] = [
    "FPS",
    "CHATS_RTGS",
    "CIPS_RMB",
    "SWIFT",
    "HKD_STABLECOIN",
  ];

  return rails.map((rail) => {
    let status: RailOption["status"] = "not_suitable";
    if (rail === recommended) {
      status = "recommended";
    } else if (rail === "SWIFT" && recommended !== "HOLD_OR_BLOCK") {
      // SWIFT is the universal fallback whenever payment is not held.
      status = "available";
    } else if (
      rail === "HKD_STABLECOIN" &&
      compliance.stablecoinEligible &&
      fraud.score <= 30 &&
      recommended !== "HOLD_OR_BLOCK"
    ) {
      status = "available";
    }
    return { rail, label: RAIL_LABELS[rail], status, reason: reasons[rail] };
  });
}
