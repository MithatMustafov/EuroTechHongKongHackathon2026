"use client";

import { motion } from "framer-motion";
import { DecisionWidget } from "@/components/widget/DecisionWidget";

const BULLETS = [
  "Fraud-checked before any money moves",
  "Compliance built in — KYC, sanctions, jurisdiction",
  "Audit-ready receipt for every decision",
];

export function Hero() {
  return (
    <section id="widget" className="relative overflow-hidden pt-10 sm:pt-16">
      {/* drifting gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -left-24 top-0 h-96 w-96 rounded-full bg-lilac opacity-60 blur-3xl" />
        <div className="animate-blob animation-delay-2 absolute right-0 top-10 h-[28rem] w-[28rem] rounded-full bg-peach opacity-50 blur-3xl" />
        <div className="animate-blob animation-delay-4 absolute left-1/3 top-40 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-pill bg-white px-3 py-1 text-xs font-semibold text-ink/70 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-2" /> For Hong Kong SMEs
            </span>
            <h1 className="display mt-5 text-5xl sm:text-6xl lg:text-7xl">
              The decision layer before money moves
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Upload a supplier invoice. Payrouter detects fraud, checks compliance, and routes it
              to the safest payment rail — FPS, CHATS, CIPS, SWIFT, or HKD stablecoin.
            </p>
            <ul className="mt-6 space-y-2">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm font-medium text-ink/80">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/demo"
                className="rounded-pill bg-ink px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Try the full demo
              </a>
              <a
                href="#features"
                className="rounded-pill bg-white px-6 py-3.5 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5"
              >
                See how it works
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <DecisionWidget />
        </motion.div>
      </div>
    </section>
  );
}
