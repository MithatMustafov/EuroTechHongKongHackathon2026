import type { Decision, Invoice, Supplier } from "./types";
import { RAIL_LABELS } from "./types";
import { scoreFraud } from "./fraud";
import { checkCompliance } from "./compliance";
import { recommendRail, buildRailOptions } from "./rails";
import { findSupplier } from "@/lib/data/suppliers";

export * from "./types";
export { scoreFraud } from "./fraud";
export { checkCompliance } from "./compliance";
export { recommendRail, buildRailOptions } from "./rails";
export { deriveSignals } from "./signals";

/** Run the full pipeline: fraud → compliance → rail decision. */
export function analyze(invoice: Invoice, supplierArg?: Supplier): Decision {
  const supplier = supplierArg ?? findSupplier(invoice.supplierName);
  const fraud = scoreFraud(invoice, supplier);
  const compliance = checkCompliance(invoice, supplier);
  const recommendedRail = recommendRail(invoice, fraud, compliance, supplier);
  const rails = buildRailOptions(invoice, fraud, compliance, supplier, recommendedRail);

  const action = recommendedRail === "HOLD_OR_BLOCK" ? "hold_payment" : "confirm_payment";

  const explanation =
    recommendedRail === "HOLD_OR_BLOCK"
      ? `Payment held — ${fraud.topReasons[0]?.toLowerCase() ?? "risk detected"}. Verify the supplier before paying.`
      : `Recommended rail: ${RAIL_LABELS[recommendedRail]}. ${
          rails.find((r) => r.rail === recommendedRail)?.reason ?? ""
        }`;

  return { invoice, fraud, compliance, recommendedRail, rails, action, explanation };
}
