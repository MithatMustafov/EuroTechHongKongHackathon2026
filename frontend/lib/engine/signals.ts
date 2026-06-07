import type { Invoice, Supplier } from "./types";
import { findSupplier } from "@/lib/data/suppliers";
import { isRiskyDestination } from "@/lib/data/risky_wallets";
import { isSanctioned } from "@/lib/data/sanctions_mock";

const URGENCY_PATTERNS = [
  "urgent",
  "pay today",
  "send today",
  "immediately",
  "avoid delay",
  "shipment will be cancelled",
  "asap",
];

const PRESSURE_PATTERNS = [
  "do not call",
  "confidential",
  "ceo approved",
  "new wallet",
  "account changed",
  "our payment wallet has changed",
  "do not use the previous",
];

export interface DerivedSignals {
  supplier?: Supplier;
  newSupplier: boolean;
  amountUnusual: boolean;
  paymentDestinationChanged: boolean;
  walletOrAccountNotVerified: boolean;
  urgencyDetected: boolean;
  pressureLanguageDetected: boolean;
  emailDomainMismatch: boolean;
  walletOnRiskList: boolean;
  sanctionsHit: boolean;
}

function matchesAny(text: string | undefined, patterns: string[]): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return patterns.some((p) => t.includes(p));
}

/** Derive the raw boolean signals the fraud/compliance modules consume. */
export function deriveSignals(invoice: Invoice, supplierArg?: Supplier): DerivedSignals {
  const supplier = supplierArg ?? findSupplier(invoice.supplierName);
  const dest = invoice.paymentDestination;
  const verified = supplier?.verifiedDestinations ?? [];

  const walletOrAccountNotVerified = !supplier || !verified.includes(dest);
  const paymentDestinationChanged =
    invoice.paymentDetailsChanged === true ||
    (!!supplier && !verified.includes(dest));

  return {
    supplier,
    newSupplier: !supplier,
    amountUnusual: supplier
      ? invoice.amount > supplier.typicalAmount * 3
      : invoice.amount > 100000,
    paymentDestinationChanged,
    walletOrAccountNotVerified,
    urgencyDetected: matchesAny(invoice.rawText, URGENCY_PATTERNS),
    pressureLanguageDetected: matchesAny(invoice.rawText, PRESSURE_PATTERNS),
    emailDomainMismatch:
      !!supplier &&
      !!invoice.senderDomain &&
      invoice.senderDomain.toLowerCase() !== supplier.expectedDomain.toLowerCase(),
    walletOnRiskList: isRiskyDestination(dest),
    sanctionsHit: isSanctioned(invoice.supplierName, invoice.supplierCountry, dest),
  };
}
