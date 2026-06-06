"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Decision, RailId } from "@/lib/engine/types";
import { formatAmount } from "@/lib/utils";

// Realistic settlement narratives per rail (timing in ms per stage).
const FLOWS: Record<Exclude<RailId, "HKD_STABLECOIN" | "HOLD_OR_BLOCK">, {
  from: string;
  to: string;
  speed: number;
  stages: string[];
  footnote: string;
}> = {
  FPS: {
    from: "Your HK bank",
    to: "Beneficiary (HK)",
    speed: 650,
    stages: [
      "Initiating FPS instant transfer",
      "Routing via FPS proxy ID (HKD)",
      "Crediting beneficiary bank · 24/7",
      "Settled — funds available instantly",
    ],
    footnote: "FPS clears in seconds, any time of day.",
  },
  CHATS_RTGS: {
    from: "Your HK bank",
    to: "Beneficiary bank",
    speed: 850,
    stages: [
      "Submitting CHATS payment instruction",
      "Queued at HKICL real-time gross settlement",
      "Gross settlement across settlement accounts",
      "Final & irrevocable — high-value settled",
    ],
    footnote: "CHATS/RTGS settles large-value payments with finality.",
  },
  CIPS_RMB: {
    from: "Your HK bank",
    to: "Mainland supplier",
    speed: 850,
    stages: [
      "Submitting payment to CIPS",
      "Offshore → onshore RMB clearing",
      "Mainland correspondent bank credit",
      "Cross-border RMB settled",
    ],
    footnote: "CIPS clears cross-border RMB to the Mainland.",
  },
  SWIFT: {
    from: "Your HK bank",
    to: "Overseas beneficiary",
    speed: 950,
    stages: [
      "Generating MT103 message",
      "Transmitting over the SWIFT network",
      "Correspondent bank hop",
      "Beneficiary bank credit · 1–2 business days",
    ],
    footnote: "SWIFT routes international transfers via correspondent banks.",
  },
};

export function RailSettlement({
  decision,
  onComplete,
}: {
  decision: Decision;
  onComplete: () => void;
}) {
  const rail = decision.recommendedRail as keyof typeof FLOWS;
  const flow = FLOWS[rail] ?? FLOWS.SWIFT;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= flow.stages.length) {
      const t = setTimeout(onComplete, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((a) => a + 1), flow.speed);
    return () => clearTimeout(t);
  }, [active, flow, onComplete]);

  const progress = Math.min(active / flow.stages.length, 1);

  return (
    <div className="py-2">
      {/* route from → to */}
      <div className="mb-4 flex items-center justify-between gap-2 text-xs font-medium">
        <span className="rounded-pill bg-white px-3 py-1.5 shadow-sm">{flow.from}</span>
        <div className="relative mx-1 h-1 flex-1 overflow-hidden rounded-pill bg-line">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-pill bg-ink"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
          <motion.span
            className="absolute -top-1.5 h-4 w-4 rounded-full bg-brand-2 shadow"
            animate={{ left: `calc(${progress * 100}% - 8px)` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="rounded-pill bg-white px-3 py-1.5 shadow-sm">{flow.to}</span>
      </div>

      <p className="mb-3 text-center text-sm font-semibold">
        Settling {formatAmount(decision.invoice.amount, decision.invoice.currency)} via{" "}
        {decision.rails.find((r) => r.rail === decision.recommendedRail)?.label}
      </p>

      <ul className="space-y-2.5">
        {flow.stages.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  done ? "bg-brand-2 text-white" : current ? "bg-ink text-white" : "bg-line text-muted"
                }`}
              >
                {done ? "✓" : ""}
              </span>
              <span className={done || current ? "text-ink" : "text-muted"}>{label}</span>
              {current && (
                <motion.span className="ml-auto h-1.5 w-12 overflow-hidden rounded-pill bg-line">
                  <motion.span
                    className="block h-full bg-ink"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: flow.speed / 1000 }}
                  />
                </motion.span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-[11px] text-muted">{flow.footnote}</p>
    </div>
  );
}
