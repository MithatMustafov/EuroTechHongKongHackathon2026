"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Decision, Invoice } from "@/lib/engine/types";
import { SAMPLE_INVOICES, SAMPLE_META } from "@/lib/data/sample_invoices";
import { analyzeWithBackend, analyzePdfWithBackend } from "@/lib/api/backend";
import type { AnalysisResult } from "@/lib/api/backend";
import { formatAmount } from "@/lib/utils";
import { FraudMeter } from "./FraudMeter";
import { ComplianceChecklist } from "./ComplianceChecklist";
import { RailCard } from "./RailCard";
import { RailSettlement } from "./RailSettlement";
import { StablecoinSettlement, type SettlementResult } from "./StablecoinSettlement";
import { ReceiptCapture } from "./ReceiptCapture";
import { PayRouterAssistant } from "./PayRouterAssistant";
import { explorerTx } from "@/lib/chain/hkdap";
import { downloadDecisionReport } from "@/lib/pdf/report";

type Step = "select" | "analyzing" | "summary" | "payment" | "receipt" | "review";

const ANALYSIS_STEPS: { label: string; ms: number }[] = [
  { label: "Extracting invoice details",  ms: 800  },
  { label: "Checking supplier identity",  ms: 650  },
  { label: "Scanning for fraud patterns", ms: 950  },
  { label: "Running compliance checks",   ms: 1100 },
  { label: "Comparing payment rails",     ms: 700  },
];

export function DecisionWidget({ wide = false }: { wide?: boolean }) {
  const [step, setStep] = useState<Step>("select");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [simulateStablecoin, setSimulateStablecoin] = useState(false);

  // Holds the in-flight backend promise so animation and API call run in parallel.
  const pendingDecision = useRef<Promise<AnalysisResult> | null>(null);
  const [analysisLive, setAnalysisLive] = useState<boolean | null>(null);

  const start = useCallback((inv: Invoice) => {
    setInvoice(inv);
    setDecision(null);
    setSettlement(null);
    setSimulateStablecoin(false);
    pendingDecision.current = analyzeWithBackend(inv);
    setStep("analyzing");
  }, []);

  const startWithDecision = useCallback((inv: Invoice, dec: Decision) => {
    pendingDecision.current = null;
    setInvoice(inv);
    setDecision(dec);
    setAnalysisLive(true);
    setSettlement(null);
    setSimulateStablecoin(false);
    setStep("summary");
  }, []);

  const startWithDecisionAnimated = useCallback((inv: Invoice, dec: Decision) => {
    setInvoice(inv);
    setDecision(null);
    setSettlement(null);
    setSimulateStablecoin(false);
    pendingDecision.current = Promise.resolve({ decision: dec, live: true });
    setStep("analyzing");
  }, []);

  const reset = useCallback(() => {
    pendingDecision.current = null;
    setStep("select");
    setInvoice(null);
    setDecision(null);
    setAnalysisLive(null);
    setSettlement(null);
    setSimulateStablecoin(false);
  }, []);

  const onAnalysisDone = useCallback(() => {
    if (!invoice || !pendingDecision.current) return;
    const promise = pendingDecision.current;
    promise.then(({ decision: d, live }) => {
      // Ignore stale results if the user reset before the backend responded.
      if (pendingDecision.current === promise) {
        setDecision(d);
        setAnalysisLive(live);
        setStep("summary");
      }
    });
  }, [invoice]);

  return (
    <div className="w-full rounded-[28px] bg-white p-2 shadow-[0_30px_80px_-20px_rgba(80,70,120,0.45)] ring-1 ring-black/5">
      <div className={`rounded-[22px] bg-bg/60 ${wide ? "p-5 sm:p-8" : "p-4 sm:p-5"}`}>
        {/* widget header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-2" />
            <span className="text-sm font-semibold">Payrouter decision</span>
            {analysisLive === true && (
              <span className="rounded-pill bg-ok/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                Live
              </span>
            )}
            {analysisLive === false && (
              <span className="rounded-pill bg-warn/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                Local — start backend
              </span>
            )}
          </div>
          {step !== "select" && (
            <button
              onClick={reset}
              className="rounded-pill bg-white px-3 py-1 text-xs font-medium text-muted shadow-sm transition hover:text-ink"
            >
              New invoice
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <StepShell key="select">
              <SelectStep onSelect={start} onStartWithDecision={startWithDecision} onStartWithDecisionAnimated={startWithDecisionAnimated} wide={wide} />
            </StepShell>
          )}
          {step === "analyzing" && (
            <StepShell key="analyzing">
              <AnalyzingStep invoice={invoice!} onDone={onAnalysisDone} />
            </StepShell>
          )}
          {step === "summary" && decision && (
            <StepShell key="summary">
              <SummaryStep
                decision={decision}
                onConfirm={() => setStep("payment")}
                onReview={() => setStep("review")}
              />
            </StepShell>
          )}
          {step === "payment" && decision && (
            <StepShell key="payment">
              {decision.recommendedRail === "HKD_STABLECOIN" && !simulateStablecoin ? (
                <StablecoinSettlement
                  decision={decision}
                  onComplete={(r) => {
                    setSettlement(r);
                    setStep("receipt");
                  }}
                  onFallback={() => setSimulateStablecoin(true)}
                />
              ) : decision.recommendedRail === "HKD_STABLECOIN" ? (
                <PaymentStep decision={decision} onDone={() => setStep("receipt")} />
              ) : (
                <RailSettlement decision={decision} onComplete={() => setStep("receipt")} />
              )}
            </StepShell>
          )}
          {step === "receipt" && decision && (
            <StepShell key="receipt">
              <ReceiptStep decision={decision} settlement={settlement} onReset={reset} />
            </StepShell>
          )}
          {step === "review" && decision && (
            <StepShell key="review">
              <ReviewStep decision={decision} onReset={reset} />
            </StepShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- Select ----------------------------- */

function SelectStep({
  onSelect,
  onStartWithDecision,
  onStartWithDecisionAnimated,
  wide = false,
}: {
  onSelect: (inv: Invoice) => void;
  onStartWithDecision: (inv: Invoice, dec: Decision) => void;
  onStartWithDecisionAnimated: (inv: Invoice, dec: Decision) => void;
  wide?: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Pick a sample supplier invoice to route — or paste your own.
      </p>
      <div className={`grid gap-2 ${wide ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {SAMPLE_INVOICES.map((inv) => {
          const meta = SAMPLE_META[inv.id];
          return (
            <button
              key={inv.id}
              onClick={() => onSelect(inv)}
              className="group flex items-center justify-between rounded-2xl border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
            >
              <span>
                <span className="block text-sm font-semibold">{inv.supplierName}</span>
                <span className="block text-xs text-muted">
                  {formatAmount(inv.amount, inv.currency)} · {inv.supplierCountry}
                </span>
              </span>
              <span className="rounded-pill bg-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink/60 group-hover:bg-ink group-hover:text-white">
                {meta?.tag}
              </span>
            </button>
          );
        })}
      </div>
      <UploadAffordance onSelect={onSelect} onStartWithDecision={onStartWithDecision} onStartWithDecisionAnimated={onStartWithDecisionAnimated} />
    </div>
  );
}

function UploadAffordance({
  onSelect,
  onStartWithDecision,
  onStartWithDecisionAnimated,
}: {
  onSelect: (inv: Invoice) => void;
  onStartWithDecision: (inv: Invoice, dec: Decision) => void;
  onStartWithDecisionAnimated: (inv: Invoice, dec: Decision) => void;
}) {
  const [mode, setMode] = useState<"closed" | "paste" | "uploading" | "ready">("closed");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [readyData, setReadyData] = useState<{ invoice: Invoice; decision: Decision } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePaste() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.invoice) {
        onSelect(data.invoice as Invoice);
      } else {
        setNote(
          data.message ??
            "Live extraction isn’t configured. Try one of the sample invoices above.",
        );
      }
    } catch {
      setNote("Couldn’t reach the extractor. Try a sample invoice above.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMode("uploading");
    setNote(null);
    try {
      const { invoice, decision } = await analyzePdfWithBackend(file);
      setReadyData({ invoice, decision });
      setMode("ready");
    } catch (err) {
      setNote(
        err instanceof Error ? err.message : "PDF analysis failed. Try again.",
      );
      setMode("closed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (mode === "uploading") {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
        <motion.span
          className="h-4 w-4 rounded-full border-2 border-ink border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
        Reading PDF…
        {note && <span className="ml-auto text-xs text-danger">{note}</span>}
      </div>
    );
  }

  if (mode === "ready" && readyData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 space-y-2"
      >
        <div className="rounded-2xl border border-line bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1">Invoice loaded</p>
          <p className="text-sm font-semibold text-ink">{readyData.invoice.supplierName}</p>
          <p className="text-xs text-muted">
            {formatAmount(readyData.invoice.amount, readyData.invoice.currency)} · {readyData.invoice.supplierCountry}
          </p>
        </div>
        <button
          onClick={() => onStartWithDecisionAnimated(readyData.invoice, readyData.decision)}
          className="w-full rounded-pill bg-brand-2 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Analyze Transfer →
        </button>
        <button
          onClick={() => { setMode("closed"); setReadyData(null); }}
          className="w-full rounded-pill bg-bg py-2 text-xs font-medium text-muted transition hover:text-ink"
        >
          Upload a different file
        </button>
      </motion.div>
    );
  }

  if (mode === "paste") {
    return (
      <div className="mt-3 rounded-2xl border border-line bg-white p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Paste invoice text here…"
          className="w-full resize-none rounded-xl bg-bg p-2 text-sm outline-none placeholder:text-muted/70"
        />
        {note && <p className="mt-2 text-xs text-warn">{note}</p>}
        <div className="mt-2 flex gap-2">
          <button
            onClick={handlePaste}
            disabled={busy || text.trim().length < 5}
            className="flex-1 rounded-pill bg-ink py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Extracting…" : "Analyze invoice"}
          </button>
          <button
            onClick={() => setMode("closed")}
            className="rounded-pill bg-bg px-4 py-2 text-sm font-medium text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handlePdfChange}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex-1 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted transition hover:border-ink/30 hover:text-ink"
      >
        ↑ Upload PDF invoice
      </button>
      <button
        onClick={() => setMode("paste")}
        className="flex-1 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted transition hover:border-ink/30 hover:text-ink"
      >
        + Paste invoice text
      </button>
    </div>
  );
}

/* ----------------------------- Analyzing ----------------------------- */

function AnalyzingStep({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= ANALYSIS_STEPS.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((a) => a + 1), ANALYSIS_STEPS[active].ms);
    return () => clearTimeout(t);
  }, [active, onDone]);

  return (
    <div className="py-2">
      <p className="mb-4 text-sm text-muted">
        Analyzing invoice from{" "}
        <span className="font-semibold text-ink">{invoice.supplierName}</span>…
      </p>
      <ul className="space-y-2.5">
        {ANALYSIS_STEPS.map(({ label, ms }, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <motion.li
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: done ? 0.55 : current ? 1 : 0.35, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 text-sm"
            >
              {/* Step icon */}
              <span className="relative h-5 w-5 shrink-0">
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 480, damping: 22 }}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-2 text-[11px] text-white"
                    >
                      ✓
                    </motion.span>
                  ) : current ? (
                    <motion.span
                      key="spinning"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 rounded-full border-2 border-ink border-t-transparent animate-spin"
                    />
                  ) : (
                    <motion.span
                      key="pending"
                      className="absolute inset-0 rounded-full bg-line"
                    />
                  )}
                </AnimatePresence>
              </span>

              {/* Label */}
              <span className={current ? "font-medium text-ink" : "text-ink/80"}>{label}</span>

              {/* Progress bar — only for current step */}
              <AnimatePresence>
                {current && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 56 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-auto h-1.5 shrink-0 overflow-hidden rounded-pill bg-line"
                  >
                    <motion.span
                      className="block h-full rounded-pill bg-ink"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: ms / 1000 - 0.15, ease: "linear" }}
                    />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ----------------------------- Summary ----------------------------- */

function SummaryStep({
  decision,
  onConfirm,
  onReview,
}: {
  decision: Decision;
  onConfirm: () => void;
  onReview: () => void;
}) {
  const { invoice, fraud, compliance, rails } = decision;
  const held = decision.action === "hold_payment";
  const [downloading, setDownloading] = useState(false);
  const [auditSummary, setAuditSummary] = useState<string | undefined>(undefined);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadDecisionReport(decision, auditSummary);
    } finally {
      setDownloading(false);
    }
  }

  const railCards = rails
    .filter((r) => r.rail !== "HOLD_OR_BLOCK")
    .slice()
    .sort((a, b) => statusRank(a.status) - statusRank(b.status));

  const recommendedRail = railCards.find((r) => r.status === "recommended");

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="space-y-4">
      {/* 1 — Invoice */}
      <motion.div {...fadeUp(0)}>
        <Section title="Invoice">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <Field label="Supplier" value={invoice.supplierName} />
            <Field label="Country" value={invoice.supplierCountry} />
            <Field label="Amount" value={formatAmount(invoice.amount, invoice.currency)} />
            <Field label="Invoice #" value={invoice.invoiceNumber} />
            {invoice.goods && <Field label="Goods" value={invoice.goods} />}
            {invoice.dueDate && <Field label="Due date" value={invoice.dueDate} />}
          </dl>
        </Section>
      </motion.div>

      {/* 2 — Fraud check */}
      <motion.div {...fadeUp(0.12)}>
        <Section title="Fraud check">
          <FraudMeter fraud={fraud} />
        </Section>
      </motion.div>

      {/* 3 — Compliance */}
      <motion.div {...fadeUp(0.22)}>
        <Section title={`Compliance · ${compliance.status}`}>
          <ComplianceChecklist compliance={compliance} />
        </Section>
      </motion.div>

      {/* 4 — Rail comparison (cards) */}
      <motion.div {...fadeUp(0.32)}>
        <Section title="Rail comparison">
          <div className="space-y-2">
            {railCards.map((r) => (
              <RailCard key={r.rail} option={r} />
            ))}
          </div>
        </Section>
      </motion.div>

      {/* 5 — PayRouter AI audit summary */}
      <motion.div {...fadeUp(0.4)}>
        <PayRouterAssistant decision={decision} onSummaryReady={setAuditSummary} />
      </motion.div>

      <motion.div {...fadeUp(0.5)} className="space-y-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full rounded-pill border border-line bg-white py-2.5 text-sm font-medium text-ink/80 transition hover:-translate-y-0.5 hover:border-ink/30 hover:text-ink disabled:opacity-50"
        >
          {downloading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink/40 border-t-ink"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
              />
              Generating PDF…
            </span>
          ) : (
            "↓ Download compliance report"
          )}
        </button>

        {held ? (
          <button
            onClick={onReview}
            className="w-full rounded-pill bg-danger py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Hold payment · Create review case
          </button>
        ) : (
          <button
            onClick={onConfirm}
            className="w-full rounded-pill bg-ink py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Confirm payment via {recommendedRail?.label ?? "selected rail"}
          </button>
        )}
      </motion.div>
    </div>
  );
}

function statusRank(s: string) {
  return s === "recommended" ? 0 : s === "available" ? 1 : 2;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/* ----------------------------- Payment ----------------------------- */

const PAYMENT_STAGES = ["Confirming", "Processing via rail", "Payment initiated", "Receipt generated"];

function PaymentStep({ decision, onDone }: { decision: Decision; onDone: () => void }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= PAYMENT_STAGES.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  return (
    <div className="py-6 text-center">
      <motion.div
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ink text-2xl text-white"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
      >
        ⇄
      </motion.div>
      <p className="text-sm font-semibold">
        {PAYMENT_STAGES[Math.min(stage, PAYMENT_STAGES.length - 1)]}…
      </p>
      <p className="mt-1 text-xs text-muted">
        {decision.rails.find((r) => r.rail === decision.recommendedRail)?.label} rail
      </p>
    </div>
  );
}

/* ----------------------------- Receipt ----------------------------- */

function ReceiptStep({
  decision,
  settlement,
  onReset,
}: {
  decision: Decision;
  settlement: SettlementResult | null;
  onReset: () => void;
}) {
  const isStable = decision.recommendedRail === "HKD_STABLECOIN";
  const railLabel = decision.rails.find((r) => r.rail === decision.recommendedRail)?.label;
  const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ok/10 p-4 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ok text-xl text-white">
          ✓
        </div>
        <p className="font-semibold text-ok">Payment completed</p>
        <p className="text-xs text-muted">via {railLabel}</p>
      </div>

      <Section title="Compliance receipt">
        <dl className="space-y-1.5 text-sm">
          <ReceiptRow label="Supplier" value={decision.invoice.supplierName} />
          <ReceiptRow label="Amount" value={formatAmount(decision.invoice.amount, decision.invoice.currency)} />
          <ReceiptRow label="Invoice" value={decision.invoice.invoiceNumber} />
          <ReceiptRow label="Rail" value={railLabel ?? ""} />
          <ReceiptRow label="Fraud risk" value={`${decision.fraud.score}/100 · ${decision.fraud.level}`} />
          <ReceiptRow label="Compliance" value={decision.compliance.status} />
          {settlement?.txHash ? (
            <div className="flex justify-between border-b border-line pb-1.5">
              <dt className="text-muted">Sepolia tx</dt>
              <dd className="font-medium">
                <a
                  className="text-brand underline"
                  href={explorerTx(settlement.txHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {short(settlement.txHash)} ↗
                </a>
              </dd>
            </div>
          ) : (
            isStable && <ReceiptRow label="Tx reference" value="0xA92…F31 (simulated)" />
          )}
          <ReceiptRow label="Receipt ID" value={`PR-${decision.invoice.invoiceNumber}`} />
        </dl>
      </Section>

      <p className="text-center text-[11px] text-muted">
        {settlement?.txHash
          ? "Settled live on Sepolia testnet. This is a mock HKDAP token with no value."
          : "Demo: payment execution is visualized. Non-crypto rails are simulated."}
      </p>

      <ReceiptCapture decision={decision} settlement={settlement} />

      <button
        onClick={onReset}
        className="w-full rounded-pill bg-bg py-3 text-sm font-semibold text-ink transition hover:bg-line"
      >
        Route another invoice
      </button>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

/* ----------------------------- Review (held) ----------------------------- */

function ReviewStep({ decision, onReset }: { decision: Decision; onReset: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-danger/10 p-4 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-danger text-xl text-white">
          !
        </div>
        <p className="font-semibold text-danger">Review case created</p>
        <p className="text-xs text-muted">Payment held — not sent</p>
      </div>

      <Section title="Why it was held">
        <ul className="space-y-1.5 text-sm text-ink/80">
          {decision.fraud.topReasons.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <span className="mt-0.5 text-danger">✕</span>
              {r}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Suggested next steps">
        <ul className="space-y-1.5 text-sm text-ink/80">
          <li>· Call the supplier using a previously known contact</li>
          <li>· Request written confirmation from the known email domain</li>
          <li>· Require manager approval before release</li>
        </ul>
      </Section>

      <button
        onClick={onReset}
        className="w-full rounded-pill bg-bg py-3 text-sm font-semibold text-ink transition hover:bg-line"
      >
        Route another invoice
      </button>
    </div>
  );
}
