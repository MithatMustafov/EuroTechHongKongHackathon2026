import type {
  Decision,
  Invoice,
  RailId,
  RailStatus,
  RailOption,
  RailCost,
  FraudResult,
  ComplianceResult,
  Currency,
} from "@/lib/engine/types";
import { analyze, RAIL_LABELS } from "@/lib/engine";
import { deriveSignals } from "@/lib/engine/signals";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

// ── Request mapper ────────────────────────────────────────────────────────────

function toDto(invoice: Invoice) {
  const signals = deriveSignals(invoice);
  return {
    invoice_number: invoice.invoiceNumber,
    due_date: invoice.dueDate,
    payer: { name: "Payrouter Demo", country: "Hong Kong" },
    supplier: {
      name: invoice.supplierName,
      country: invoice.supplierCountry,
      email: invoice.senderDomain
        ? `invoice@${invoice.senderDomain}`
        : undefined,
    },
    payment: {
      amount: invoice.amount,
      currency: invoice.currency,
      purpose: invoice.goods,
      beneficiary_name: invoice.supplierName,
      destination: { account_number: invoice.paymentDestination },
      stablecoin_wallet_verified: invoice.acceptsStablecoin ?? false,
    },
    risk_signals: {
      urgency_language: signals.urgencyDetected,
      pressure_language: signals.pressureLanguageDetected,
      secrecy_language: signals.pressureLanguageDetected,
      payment_details_changed: invoice.paymentDetailsChanged ?? false,
    },
  };
}

// ── Response mapper ───────────────────────────────────────────────────────────

interface BackendCostEstimate {
  rail: string;
  flat_fee_hkd: { min: number; max: number };
  fx_cost_hkd: number;
  intermediary_fees_hkd: { min: number; max: number };
  total_estimated_hkd: { min: number; max: number };
  fx_markup_pct: number;
  settlement_time: string;
}

interface BackendResponse {
  invoice_number: string;
  analyzed_at: string;
  compliance: {
    overall_status: string;
    hard_fail: boolean;
    checks: {
      check: string;
      status: string;
      detail: string;
      source?: string;
      screens?: { query: string; hits: number; matches?: string[] }[];
      pep_screens?: { query: string; hits: number; matches?: string[] }[];
    }[];
  };
  fraud: {
    score: number;
    level: string;
    hold_required: boolean;
    top_reasons: string[];
    triggered_rules: string[];
  };
  recommendation: {
    recommended_rail: string;
    reason: string;
    alternatives: Array<{ rail: string; eligible: boolean; reason?: string }>;
  };
  cost_estimates: BackendCostEstimate[];
}

function mapRailId(backendRail: string): RailId {
  switch (backendRail.toUpperCase()) {
    case "FPS":
      return "FPS";
    case "CHATS":
    case "CHATS_RTGS":
      return "CHATS_RTGS";
    case "CIPS":
    case "CIPS_RMB":
      return "CIPS_RMB";
    case "SWIFT":
    case "BANK_TRANSFER":
      return "SWIFT";
    case "STABLECOIN":
      return "HKD_STABLECOIN";
    case "BLOCKED":
    case "HOLD":
    case "NONE":
      return "HOLD_OR_BLOCK";
    default:
      return "HOLD_OR_BLOCK";
  }
}

function mapFraudLevel(level: string): FraudResult["level"] {
  switch (level.toUpperCase()) {
    case "LOW":
      return "low";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
    default:
      return "medium";
  }
}

function mapCheckStatus(status: string): "passed" | "failed" | "review" {
  if (status === "passed") return "passed";
  if (status === "failed") return "failed";
  return "review";
}

const CHECK_LABEL: Record<string, Record<string, string>> = {
  KYC_PAYER: {
    passed: "Payer KYC verified",
    failed: "Payer KYC failed",
    requires_review: "Payer KYC — review required",
  },
  KYB_SUPPLIER: {
    passed: "Supplier KYB on file",
    failed: "Supplier KYB failed",
    requires_review: "Supplier KYB — review required",
  },
  SANCTIONS_SCREEN: {
    passed: "Sanctions screening clear",
    failed: "Sanctions screening — HIT",
    requires_review: "Sanctions screening — review",
  },
  JURISDICTION: {
    passed: "Jurisdiction approved",
    failed: "Jurisdiction blocked",
    requires_review: "Jurisdiction — enhanced review required",
  },
  GOODS_CATEGORY: {
    passed: "Goods category: permitted",
    failed: "Goods category: restricted",
    requires_review: "Goods category: review required",
  },
  AMOUNT_POLICY: {
    passed: "Amount within policy limits",
    failed: "Amount exceeds policy limits",
    requires_review: "Amount — approval required",
  },
  CNAPS_VALIDATION: {
    passed: "CNAPS code validated",
    failed: "CNAPS validation failed",
    requires_review: "CNAPS — review required",
  },
  EMAIL_COHERENCE: {
    passed: "Email coherence verified",
    failed: "Email domain mismatch",
    requires_review: "Email coherence — review",
  },
};

function checkLabel(id: string, status: string): string {
  return CHECK_LABEL[id]?.[status] ?? CHECK_LABEL[id]?.["passed"] ?? id;
}

const BACKEND_RAILS: Array<{ key: string; id: RailId }> = [
  { key: "FPS", id: "FPS" },
  { key: "CHATS", id: "CHATS_RTGS" },
  { key: "CIPS", id: "CIPS_RMB" },
  { key: "SWIFT", id: "SWIFT" },
  { key: "STABLECOIN", id: "HKD_STABLECOIN" },
];

function toCost(est: BackendCostEstimate | undefined): RailCost | undefined {
  if (!est) return undefined;
  return {
    totalMin: est.total_estimated_hkd.min,
    totalMax: est.total_estimated_hkd.max,
    settlementTime: est.settlement_time,
    fxMarkupPct: est.fx_markup_pct,
  };
}

function buildRailOptions(
  response: BackendResponse,
  recommendedId: RailId,
): RailOption[] {
  const costMap = new Map(
    (response.cost_estimates ?? []).map((c) => [c.rail, c]),
  );
  // Keyed by backend rail name (FPS, CHATS, CIPS, SWIFT, STABLECOIN)
  const altMap = new Map(
    (response.recommendation.alternatives ?? []).map((a) => [a.rail, a]),
  );

  if (recommendedId === "HOLD_OR_BLOCK") {
    return [
      {
        rail: "HOLD_OR_BLOCK",
        label: RAIL_LABELS["HOLD_OR_BLOCK"],
        status: "recommended",
        reason: response.recommendation.reason,
      },
      ...BACKEND_RAILS.map(({ key, id }) => ({
        rail: id,
        label: RAIL_LABELS[id],
        status: "not_suitable" as RailStatus,
        reason: "Payment held — compliance review required before release.",
        cost: toCost(costMap.get(key)),
      })),
    ];
  }

  return BACKEND_RAILS.map(({ key, id }) => {
    const isRecommended = id === recommendedId;
    const alt = altMap.get(key);
    const status: RailStatus = isRecommended
      ? "recommended"
      : alt?.eligible === false
        ? "not_suitable"
        : "available";
    const reason = isRecommended
      ? response.recommendation.reason
      : alt?.reason ?? "Available for this payment";
    return {
      rail: id,
      label: RAIL_LABELS[id],
      status,
      reason,
      cost: toCost(costMap.get(key)),
    };
  });
}

const ALL_FRAUD_SIGNALS: Array<{ key: string; label: string; weight: number }> = [
  { key: "urgency_language", label: "Urgency language", weight: 20 },
  { key: "pressure_language", label: "Pressure tactics", weight: 20 },
  { key: "secrecy_language", label: "Secrecy requests", weight: 25 },
  { key: "payment_details_changed", label: "Payment details changed", weight: 30 },
  { key: "very_large_amount", label: "Very large amount", weight: 10 },
  { key: "due_date_imminent", label: "Imminent due date", weight: 10 },
];

function toDecision(response: BackendResponse, invoice: Invoice): Decision {
  const recommendedRail = mapRailId(response.recommendation.recommended_rail);
  const isHeld =
    response.fraud.hold_required ||
    response.compliance.hard_fail ||
    recommendedRail === "HOLD_OR_BLOCK";

  const triggeredRules = response.fraud.triggered_rules ?? [];
  const fraud: FraudResult = {
    score: response.fraud.score,
    level: mapFraudLevel(response.fraud.level),
    signals: ALL_FRAUD_SIGNALS.map((s) => ({ ...s, hit: triggeredRules.includes(s.key) })),
    topReasons: response.fraud.top_reasons ?? [],
  };

  const compliance: ComplianceResult = {
    status:
      response.compliance.overall_status === "passed"
        ? "passed"
        : response.compliance.overall_status === "failed"
          ? "failed"
          : "review",
    checks: (response.compliance.checks ?? []).map((c) => {
      const base = {
        key: c.check,
        label: checkLabel(c.check, c.status),
        status: mapCheckStatus(c.status),
        detail: c.detail,
      };
      if (c.check === "SANCTIONS_SCREEN") {
        // Deduplicate by entity name
        const seen = new Set<string>();
        const screens = (c.screens ?? [])
          .filter((s) => { if (seen.has(s.query)) return false; seen.add(s.query); return true; })
          .map((s) => ({ entity: s.query, hits: s.hits, matches: s.matches ?? [] }));
        const pepSeen = new Set<string>();
        const pepScreens = (c.pep_screens ?? [])
          .filter((s) => { if (pepSeen.has(s.query)) return false; pepSeen.add(s.query); return true; })
          .map((s) => ({ entity: s.query, hits: s.hits, matches: s.matches ?? [] }));
        return { ...base, meta: { screens, pepScreens, source: c.source } };
      }
      return base;
    }),
    stablecoinEligible:
      recommendedRail === "HKD_STABLECOIN" ||
      (invoice.acceptsStablecoin ?? false),
    stablecoinReason:
      recommendedRail === "HKD_STABLECOIN"
        ? "Supplier accepts HKD stablecoin settlement"
        : "Stablecoin not recommended for this payment",
  };

  return {
    invoice,
    fraud,
    compliance,
    recommendedRail,
    rails: buildRailOptions(response, recommendedRail),
    action: isHeld ? "hold_payment" : "confirm_payment",
    explanation: response.recommendation.reason,
  };
}

function mapRailStatus(status: string): RailStatus {
  switch (status.toUpperCase()) {
    case "RECOMMENDED":
      return "recommended";
    case "AVAILABLE":
      return "available";
    default:
      return "not_suitable";
  }
}

// ── PDF upload path ───────────────────────────────────────────────────────────

interface PdfAnalysisResponse {
  invoice: {
    invoice_number: string;
    due_date: string;
    supplier: { name: string; country: string; email?: string };
    payer: { name: string; country: string };
    payment: {
      amount: number;
      currency: string;
      purpose: string;
      requested_method: string;
      beneficiary_name: string;
      destination: Record<string, unknown>;
    };
    risk_signals: {
      urgency_language: boolean;
      pressure_language: boolean;
      secrecy_language: boolean;
      payment_details_changed: boolean;
    };
  };
  risk_score: {
    score: number;
    level: string;
    summary: string;
    reasons: { label: string; severity: string }[];
  };
  rail_decision: {
    recommended_rail: string;
    summary: string;
    rail_options: { rail: string; status: string; reason: string }[];
  };
  final_decision: {
    type: string;
    title: string;
    message: string;
    primary_action_label: string;
  };
}

function extractDestination(dest: Record<string, unknown>): string {
  return (
    (dest.fps_id as string) ||
    (dest.proxy_value as string) ||
    (dest.iban as string) ||
    (dest.value as string) ||
    (dest.account_number as string) ||
    (dest.raw_text as string) ||
    ""
  );
}

const VALID_CURRENCIES = new Set(["HKD", "RMB", "USD", "EUR"]);

function pdfInvoiceToFrontend(inv: PdfAnalysisResponse["invoice"]): Invoice {
  const currency = VALID_CURRENCIES.has(inv.payment.currency.toUpperCase())
    ? (inv.payment.currency.toUpperCase() as Currency)
    : "HKD";

  const senderDomain = inv.supplier.email?.split("@")[1];

  return {
    id: `pdf-${inv.invoice_number}`,
    supplierName: inv.supplier.name,
    supplierCountry: inv.supplier.country,
    invoiceNumber: inv.invoice_number,
    amount: inv.payment.amount,
    currency,
    goods: inv.payment.purpose,
    dueDate: inv.due_date,
    paymentDestination: extractDestination(inv.payment.destination),
    senderDomain,
    paymentDetailsChanged: inv.risk_signals.payment_details_changed,
    acceptsStablecoin:
      inv.payment.requested_method?.toUpperCase() === "STABLECOIN",
  };
}

function pdfResponseToDecision(
  data: PdfAnalysisResponse,
  invoice: Invoice,
): Decision {
  const recommendedRail = mapRailId(data.rail_decision.recommended_rail);
  const finalType = data.final_decision.type;
  const isHeld = finalType === "HOLD_FOR_REVIEW" || finalType === "BLOCK_PAYMENT";

  const fraud: FraudResult = {
    score: data.risk_score.score,
    level: mapFraudLevel(data.risk_score.level),
    signals: [],
    topReasons:
      data.risk_score.reasons?.map((r) => r.label) ??
      (data.risk_score.summary ? [data.risk_score.summary] : []),
  };

  const complianceStatus: "passed" | "failed" | "review" =
    finalType === "CONFIRM_PAYMENT"
      ? "passed"
      : finalType === "WARN_BEFORE_PAYMENT"
        ? "review"
        : "failed";

  const compliance: ComplianceResult = {
    status: complianceStatus,
    checks: (data.risk_score.reasons ?? []).map((r) => ({
      key: r.label,
      label: r.label,
      status:
        r.severity === "LOW"
          ? "passed"
          : r.severity === "CRITICAL" || r.severity === "HIGH"
            ? "failed"
            : "review",
      detail: r.label,
    })),
    stablecoinEligible: recommendedRail === "HKD_STABLECOIN",
    stablecoinReason:
      recommendedRail === "HKD_STABLECOIN"
        ? "Stablecoin rail recommended"
        : "Stablecoin not recommended for this payment",
  };

  const seenRails = new Set<RailId>();
  const rails: RailOption[] = (data.rail_decision.rail_options ?? [])
    .map((opt) => {
      const id = mapRailId(opt.rail);
      return { rail: id, label: RAIL_LABELS[id], status: mapRailStatus(opt.status), reason: opt.reason };
    })
    .filter((r) => { if (seenRails.has(r.rail)) return false; seenRails.add(r.rail); return true; });

  return {
    invoice,
    fraud,
    compliance,
    recommendedRail,
    rails,
    action: isHeld ? "hold_payment" : "confirm_payment",
    explanation: data.rail_decision.summary || data.final_decision.message,
  };
}

function extractedToDto(inv: PdfAnalysisResponse["invoice"]) {
  const dest: Record<string, unknown> = inv.payment.destination ?? {};
  return {
    invoice_number: inv.invoice_number,
    due_date: inv.due_date,
    payer: inv.payer,
    supplier: inv.supplier,
    payment: {
      amount: inv.payment.amount,
      currency: inv.payment.currency,
      purpose: inv.payment.purpose,
      requested_method: inv.payment.requested_method,
      beneficiary_name: inv.payment.beneficiary_name,
      destination: {
        bank_name: dest.bank_name as string | undefined,
        account_number: (dest.account_number ??
          dest.iban ??
          dest.fps_id ??
          dest.value ??
          dest.proxy_value ??
          dest.raw_text) as string | undefined,
        cnaps_code: dest.cnaps_code as string | undefined,
      },
      stablecoin_wallet_verified:
        inv.payment.requested_method?.toUpperCase() === "STABLECOIN",
    },
    risk_signals: inv.risk_signals,
  };
}

export async function analyzePdfWithBackend(
  file: File,
): Promise<{ invoice: Invoice; decision: Decision }> {
  // Step 1 — extract invoice fields from the PDF
  const form = new FormData();
  form.append("pdf", file);
  const extractRes = await fetch(`${BACKEND_URL}/invoices/analyze`, {
    method: "POST",
    body: form,
  });
  if (!extractRes.ok) {
    const text = await extractRes.text().catch(() => "");
    throw new Error(`PDF extraction failed (${extractRes.status}): ${text}`);
  }
  const extracted: PdfAnalysisResponse = await extractRes.json();
  const frontendInvoice = pdfInvoiceToFrontend(extracted.invoice);

  // Step 2 — run full compliance + fraud + rail pipeline on the extracted data
  try {
    const analyzeRes = await fetch(`${BACKEND_URL}/invoice/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extractedToDto(extracted.invoice)),
    });
    if (!analyzeRes.ok) throw new Error(`Compliance call ${analyzeRes.status}`);
    const fullData: BackendResponse = await analyzeRes.json();
    return { invoice: frontendInvoice, decision: toDecision(fullData, frontendInvoice) };
  } catch (err) {
    console.error("[Payrouter] Full compliance call failed after PDF extraction:", err);
    try {
      return { invoice: frontendInvoice, decision: pdfResponseToDecision(extracted, frontendInvoice) };
    } catch {
      throw err;
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  decision: Decision;
  /** true = came from the real backend; false = local engine fallback */
  live: boolean;
}

export async function analyzeWithBackend(invoice: Invoice): Promise<AnalysisResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/invoice/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toDto(invoice)),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const data: BackendResponse = await res.json();
    return { decision: toDecision(data, invoice), live: true };
  } catch (err) {
    console.error("[Payrouter] Backend call failed — using local engine:", err);
    return { decision: analyze(invoice), live: false };
  }
}
