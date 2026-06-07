"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Decision } from "@/lib/engine/types";
import type { SettlementResult } from "./StablecoinSettlement";
import { generateReceiptPdf } from "@/lib/receipt/generatePdf";

type Stage = "idle" | "analyzing" | "analyzed" | "generating" | "ready" | "sending" | "sent" | "error";

export function ReceiptCapture({
  decision,
  settlement,
}: {
  decision: Decision;
  settlement: SettlementResult | null;
}) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [optIn, setOptIn] = useState(true);

  async function handleAnalyze() {
    setStage("analyzing");
    await new Promise((r) => setTimeout(r, 1400));
    setStage("analyzed");
  }

  const rail = decision.rails.find((r) => r.rail === decision.recommendedRail);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setErrorMsg(null);
    setStage("generating");

    let pdf: string;
    try {
      pdf = await generateReceiptPdf({ decision, settlement, email: email.trim() });
      setPdfBase64(pdf);
    } catch (err) {
      setStage("error");
      setErrorMsg("Could not generate PDF. Try again.");
      return;
    }

    // Trigger browser download immediately.
    downloadPdf(pdf, `payrouter-receipt-${decision.invoice.invoiceNumber}.pdf`);
    setStage("sending");

    // Fire-and-forget: send email + capture lead.
    try {
      await fetch("/api/receipt/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          pdfBase64: pdf,
          invoiceNumber: decision.invoice.invoiceNumber,
          supplier: decision.invoice.supplierName,
          amount: `${decision.invoice.currency} ${decision.invoice.amount.toLocaleString("en-HK")}`,
          rail: rail?.label,
          optIn,
        }),
      });
    } catch {
      // Email send is best-effort — PDF already downloaded.
    }
    setStage("sent");
  }

  // Allow re-download after submit without re-entering email.
  function handleRedownload() {
    if (pdfBase64) downloadPdf(pdfBase64, `payrouter-receipt-${decision.invoice.invoiceNumber}.pdf`);
  }

  if (stage === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="rounded-2xl bg-ok/10 p-4 text-center">
          <p className="font-semibold text-ok">Receipt downloaded ✓</p>
          <p className="mt-1 text-xs text-muted">
            A copy has been sent to <span className="font-medium text-ink">{email}</span>
          </p>
        </div>
        <button
          onClick={handleRedownload}
          className="w-full rounded-pill border border-line bg-white py-2.5 text-sm font-medium text-ink transition hover:bg-bg"
        >
          Download again
        </button>
      </motion.div>
    );
  }

  if (stage === "idle") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={handleAnalyze}
          className="w-full rounded-pill bg-brand-2 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          Analyze Payment
        </button>
      </motion.div>
    );
  }

  if (stage === "analyzing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-line bg-white p-4"
      >
        <div className="flex items-center gap-3 text-sm text-muted">
          <motion.span
            className="h-4 w-4 rounded-full border-2 border-ink border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
          Analyzing payment details…
        </div>
      </motion.div>
    );
  }

  if (stage === "analyzed") {
    const isBusy = (stage as string) === "generating" || (stage as string) === "sending";
    const fraudColor = decision.fraud.level === "low" ? "text-ok" : decision.fraud.level === "medium" ? "text-warn" : "text-danger";
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
          <p className="text-sm font-semibold">Payment analysis</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between border-b border-line pb-1.5">
              <dt className="text-muted">Fraud risk</dt>
              <dd className={`font-semibold capitalize ${fraudColor}`}>{decision.fraud.level} · {decision.fraud.score}/100</dd>
            </div>
            <div className="flex justify-between border-b border-line pb-1.5">
              <dt className="text-muted">Compliance</dt>
              <dd className="font-medium capitalize">{decision.compliance.status}</dd>
            </div>
            <div className="flex justify-between border-b border-line pb-1.5">
              <dt className="text-muted">Rail</dt>
              <dd className="font-medium">{rail?.label}</dd>
            </div>
            <div className="flex justify-between pb-1.5">
              <dt className="text-muted">Amount</dt>
              <dd className="font-medium">{decision.invoice.currency} {decision.invoice.amount.toLocaleString("en-HK")}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="mb-1 text-sm font-semibold">Download compliance receipt</p>
          <p className="mb-3 text-xs text-muted">
            Enter your email to receive the PDF — we&apos;ll also keep you updated on Payrouter.
          </p>

          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-ink"
            />

            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="rounded"
              />
              Send me updates about Payrouter and Hong Kong payment rails
            </label>

            {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

            <button
              type="submit"
              disabled={!emailValid || isBusy}
              className="w-full rounded-pill bg-ink py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {(stage as string) === "generating"
                ? "Generating PDF…"
                : (stage as string) === "sending"
                  ? "Sending…"
                  : "Download & send receipt"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted">
          Your email is stored securely. You can unsubscribe any time.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="mb-1 text-sm font-semibold">Download compliance receipt</p>
        <p className="mb-3 text-xs text-muted">
          Enter your email to receive the PDF — we&apos;ll also keep you updated on Payrouter.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-ink"
          />

          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="rounded"
            />
            Send me updates about Payrouter and Hong Kong payment rails
          </label>

          {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

          <button
            type="submit"
            disabled={!emailValid || stage === "generating" || stage === "sending"}
            className="w-full rounded-pill bg-ink py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {stage === "generating"
              ? "Generating PDF…"
              : stage === "sending"
                ? "Sending…"
                : "Download & send receipt"}
          </button>
        </form>
      </div>

      <p className="text-center text-[10px] text-muted">
        Your email is stored securely. You can unsubscribe any time.
      </p>
    </motion.div>
  );
}

function downloadPdf(base64: string, filename: string) {
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
