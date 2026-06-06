"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./Reveal";

const ITEMS = [
  {
    q: "Which payment rails does Payrouter route across?",
    a: "FPS for fast local HKD/RMB, CHATS/RTGS for large-value domestic settlement, CIPS for cross-border RMB to the Mainland, SWIFT for international bank transfers, and a regulated HKD stablecoin rail when it's verified, compliant and useful.",
  },
  {
    q: "Does Payrouter actually move the money?",
    a: "No. Payrouter is the decision layer before execution. We score fraud, run compliance, and recommend the safest rail — your bank or payment provider executes. In this demo, execution is visualized.",
  },
  {
    q: "How does fraud detection work?",
    a: "A deterministic engine checks for changed payment details, unverified beneficiaries, urgency and pressure language, supplier domain mismatches and risk-listed wallets, producing a 0–100 score with clear reasons.",
  },
  {
    q: "Is the HKD stablecoin real?",
    a: "We simulate a future regulated HKD stablecoin rail in line with Hong Kong's stablecoin issuer regime (live since August 2025). Payrouter does not issue a stablecoin; settlement here is a visual simulation.",
  },
  {
    q: "What happens to my invoice data?",
    a: "In this demo everything runs locally in your browser against mock supplier, sanctions and rail data — no invoice leaves the machine unless you configure an optional extraction key.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <h2 className="display text-center text-4xl sm:text-5xl">Frequently asked questions.</h2>
      </Reveal>
      <div className="mt-10 space-y-3">
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={item.q} delay={i * 0.05}>
              <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold">{item.q}</span>
                  <span className={`text-xl transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="px-5 pb-5 text-sm text-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
