"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "./Reveal";

const TABS = [
  {
    id: "dashboard",
    label: "SME Dashboard",
    title: "A dashboard your finance team actually understands.",
    points: ["Upload or pick an invoice", "See fraud + compliance at a glance", "Confirm or hold in one click"],
  },
  {
    id: "api",
    label: "API",
    title: "One endpoint for banks, PSPs and AP platforms.",
    points: ["POST an invoice, get a decision", "Deterministic, explainable output", "Drop into existing payment flows"],
  },
] as const;

const API_SNIPPET = `POST /api/decision
{
  "supplierName": "Berlin Components GmbH",
  "amount": 42000,
  "currency": "HKD",
  "paymentDestination": "0xSAFE..."
}
→ {
  "recommendedRail": "HKD_STABLECOIN",
  "fraud": { "score": 7, "level": "low" },
  "compliance": { "status": "passed" }
}`;

export function IntegrateTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("dashboard");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <Reveal>
        <h2 className="display text-4xl sm:text-5xl">Integrate effortlessly.</h2>
        <div className="mt-6 inline-flex rounded-pill bg-white p-1 shadow-sm ring-1 ring-black/5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-pill px-5 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-10 grid items-center gap-8 lg:grid-cols-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="display text-3xl">{active.title}</h3>
            <ul className="mt-5 space-y-2">
              {active.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm font-medium text-ink/80">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-2 text-[11px] text-white">
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        <div className="rounded-[28px] bg-ink p-5 font-mono text-xs leading-relaxed text-white/85 shadow-xl">
          {tab === "api" ? (
            <pre className="overflow-x-auto whitespace-pre-wrap">{API_SNIPPET}</pre>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                <span>Berlin Components GmbH</span>
                <span className="rounded-pill bg-ok px-2 py-0.5 text-[10px]">Stablecoin</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                <span>Kowloon Office Supplies</span>
                <span className="rounded-pill bg-white/20 px-2 py-0.5 text-[10px]">FPS</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                <span>Unknown sender · wallet changed</span>
                <span className="rounded-pill bg-danger px-2 py-0.5 text-[10px]">Held</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
