"use client";

import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  mock: React.ReactNode;
};

const FraudMock = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">Fraud risk</span>
      <span className="font-semibold text-danger">91/100 · critical</span>
    </div>
    <div className="h-2.5 w-full overflow-hidden rounded-pill bg-line">
      <motion.div
        className="h-full rounded-pill bg-danger"
        initial={{ width: 0 }}
        whileInView={{ width: "91%" }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      />
    </div>
    {["Payment wallet changed", "Urgency language detected", "Email domain mismatch"].map((t) => (
      <div key={t} className="flex items-center gap-2 text-sm text-ink/80">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">✕</span>
        {t}
      </div>
    ))}
  </div>
);

const ComplianceMock = () => (
  <div className="space-y-2">
    {["Payer KYC", "Supplier KYB", "Sanctions screening", "Jurisdiction", "Goods category", "Amount limit"].map(
      (t, i) => (
        <motion.div
          key={t}
          className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-sm"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
        >
          <span className="text-ink/80">{t}</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok text-[10px] text-white">✓</span>
        </motion.div>
      ),
    )}
  </div>
);

const RailMock = () => (
  <div className="space-y-2">
    {[
      { r: "HKD Stablecoin", s: "Recommended", cls: "border-ink bg-ink text-white" },
      { r: "SWIFT", s: "Available", cls: "border-line bg-white" },
      { r: "FPS", s: "Not suitable", cls: "border-line bg-bg text-muted" },
    ].map((o) => (
      <div key={o.r} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${o.cls}`}>
        <span className="font-semibold">{o.r}</span>
        <span className="text-xs opacity-80">{o.s}</span>
      </div>
    ))}
  </div>
);

const ReceiptMock = () => (
  <div className="space-y-1.5 text-sm">
    {[
      ["Supplier", "Berlin Components GmbH"],
      ["Amount", "HKD 42,000"],
      ["Rail", "HKD Stablecoin"],
      ["Tx ref", "0xA92…F31"],
      ["Compliance", "Passed"],
    ].map(([k, v]) => (
      <div key={k} className="flex justify-between border-b border-line pb-1.5">
        <span className="text-muted">{k}</span>
        <span className="font-medium">{v}</span>
      </div>
    ))}
  </div>
);

const FEATURES: Feature[] = [
  {
    id: "fraud",
    eyebrow: "Fraud detection",
    title: "Catch invoice redirection before you pay.",
    body: "Payrouter scores every invoice for changed payment details, urgency and pressure language, domain mismatches, and risky beneficiaries — and holds the payment when it matters.",
    mock: <FraudMock />,
  },
  {
    id: "compliance",
    eyebrow: "Compliance engine",
    title: "Enterprise-grade checks, SME-simple.",
    body: "KYC, supplier KYB, sanctions screening, jurisdiction, goods category and policy limits run on every invoice — producing an auditable, defensible record.",
    mock: <ComplianceMock />,
  },
  {
    id: "rails",
    eyebrow: "Smart rail routing",
    title: "The right rail for every invoice.",
    body: "FPS for local HKD, CHATS/RTGS for large value, CIPS for Mainland RMB, SWIFT for international, and HKD stablecoin only when it's verified, compliant and useful.",
    mock: <RailMock />,
  },
  {
    id: "receipts",
    eyebrow: "Audit receipts",
    title: "Every decision, on the record.",
    body: "Each payment produces a compliance receipt capturing the invoice, risk checks, compliance status, chosen rail and confirmation — ready for your auditors.",
    mock: <ReceiptMock />,
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <h2 className="display max-w-2xl text-4xl sm:text-5xl">
          From invoice to safe payment, in one flow.
        </h2>
      </Reveal>
      <div className="mt-14 space-y-20">
        {FEATURES.map((f, i) => (
          <div
            key={f.id}
            className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
          >
            <Reveal>
              <div>
                <span className="text-sm font-semibold text-brand">{f.eyebrow}</span>
                <h3 className="display mt-2 text-3xl sm:text-4xl">{f.title}</h3>
                <p className="mt-4 max-w-md text-muted">{f.body}</p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(80,70,120,0.4)] ring-1 ring-black/5">
                {f.mock}
              </div>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}
