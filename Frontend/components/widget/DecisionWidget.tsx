"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { analyze } from "@/lib/engine";
import type { Decision, Invoice } from "@/lib/engine/types";
import { SAMPLE_INVOICES, SAMPLE_META } from "@/lib/data/sample_invoices";
import { formatAmount } from "@/lib/utils";
import { FraudMeter } from "./FraudMeter";
import { ComplianceChecklist } from "./ComplianceChecklist";
import { RailCard } from "./RailCard";

type Step = "select" | "analyzing" | "summary" | "payment" | "receipt" | "review";

const ANALYSIS_STEPS = [
  "Extracting invoice details",
  "Checking supplier identity",
  "Scanning for fraud patterns",
  "Running compliance checks",
  "Comparing payment rails",
];

export function DecisionWidget({ wide = false }: { wide?: boolean }) {
  const [step, setStep] = useState<Step>("select");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);

  const start = useCallback((inv: Invoice) => {
    setInvoice(inv);
    setDecision(null);
    setStep("analyzing");
  }, []);

  const reset = useCallback(() => {
    setStep("select");
    setInvoice(null);
    setDecision(null);
  }, []);

  const onAnalysisDone = useCallback(() => {
    if (!invoice) return;
    setDecision(analyze(invoice));
    setStep("summary");
  }, [invoice]);

  return (
    <div className="w-full rounded-[28px] bg-white p-2 shadow-[0_30px_80px_-20px_rgba(80,70,120,0.45)] ring-1 ring-black/5">
      <div className={`rounded-[22px] bg-bg/60 ${wide ? "p-5 sm:p-8" : "p-4 sm:p-5"}`}>
        {/* widget header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-2" />
            <span className="text-sm font-semibold">Payrouter decision</span>
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
              <SelectStep onSelect={start} wide={wide} />
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
              <PaymentStep decision={decision} onDone={() => setStep("receipt")} />
            </StepShell>
          )}
          {step === "receipt" && decision && (
            <StepShell key="receipt">
              <ReceiptStep decision={decision} onReset={reset} />
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
  wide = false,
}: {
  onSelect: (inv: Invoice) => void;
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
      <UploadAffordance onSelect={onSelect} />
    </div>
  );
}

function UploadAffordance({ onSelect }: { onSelect: (inv: Invoice) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleParse() {
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted transition hover:border-ink/30 hover:text-ink"
      >
        + Paste / upload your own invoice
      </button>
    );
  }

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
          onClick={handleParse}
          disabled={busy || text.trim().length < 5}
          className="flex-1 rounded-pill bg-ink py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Extracting…" : "Analyze invoice"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-pill bg-bg px-4 py-2 text-sm font-medium text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Analyzing ----------------------------- */

function AnalyzingStep({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= ANALYSIS_STEPS.length) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((a) => a + 1), 620);
    return () => clearTimeout(t);
  }, [active, onDone]);

  return (
    <div className="py-2">
      <p className="mb-4 text-sm text-muted">
        Analyzing invoice from <span className="font-semibold text-ink">{invoice.supplierName}</span>…
      </p>
      <ul className="space-y-3">
        {ANALYSIS_STEPS.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  done
                    ? "bg-brand-2 text-white"
                    : current
                      ? "bg-ink text-white"
                      : "bg-line text-muted"
                }`}
              >
                {done ? "✓" : current ? "" : ""}
              </span>
              <span className={done || current ? "text-ink" : "text-muted"}>{label}</span>
              {current && (
                <motion.span
                  className="ml-auto h-1.5 w-16 overflow-hidden rounded-pill bg-line"
                >
                  <motion.span
                    className="block h-full bg-ink"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                </motion.span>
              )}
            </li>
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

  return (
    <div className="space-y-4">
      <Section title="Invoice">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Field label="Supplier" value={invoice.supplierName} />
          <Field label="Country" value={invoice.supplierCountry} />
          <Field label="Amount" value={formatAmount(invoice.amount, invoice.currency)} />
          <Field label="Invoice" value={invoice.invoiceNumber} />
        </dl>
      </Section>

      <Section title="Fraud check">
        <FraudMeter fraud={fraud} />
      </Section>

      <Section title={`Compliance · ${compliance.status}`}>
        <ComplianceChecklist compliance={compliance} />
      </Section>

      <Section title="Rail recommendation">
        <div className="space-y-2">
          {rails
            .slice()
            .sort((a, b) => statusRank(a.status) - statusRank(b.status))
            .map((o) => (
              <RailCard key={o.rail} option={o} />
            ))}
        </div>
      </Section>

      <div className="rounded-2xl bg-white p-3 text-sm text-ink/80">{decision.explanation}</div>

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
          Confirm payment
        </button>
      )}
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

function ReceiptStep({ decision, onReset }: { decision: Decision; onReset: () => void }) {
  const isStable = decision.recommendedRail === "HKD_STABLECOIN";
  const railLabel = decision.rails.find((r) => r.rail === decision.recommendedRail)?.label;
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
          {isStable && <ReceiptRow label="Tx reference" value="0xA92…F31 (simulated)" />}
          <ReceiptRow label="Receipt ID" value={`PR-${decision.invoice.invoiceNumber}`} />
        </dl>
      </Section>

      <p className="text-center text-[11px] text-muted">
        Demo: payment execution is visualized. Stablecoin settlement is simulated, not on-chain.
      </p>

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
