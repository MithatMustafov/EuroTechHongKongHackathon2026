"use client";

import { motion } from "framer-motion";
import type { FraudResult } from "@/lib/engine/types";

const LEVEL_COLOR: Record<string, string> = {
  low: "var(--color-ok)",
  medium: "var(--color-warn)",
  high: "#ea580c",
  critical: "var(--color-danger)",
};

export function FraudMeter({ fraud }: { fraud: FraudResult }) {
  const color = LEVEL_COLOR[fraud.level];
  const hasSignals = fraud.signals.length > 0;

  return (
    <div className="space-y-3">
      {/* Score bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-muted">Fraud risk score</span>
          <span className="text-sm font-semibold capitalize" style={{ color }}>
            {fraud.score}/100 · {fraud.level}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-pill bg-line">
          <motion.div
            className="h-full rounded-pill"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${fraud.score}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Signal checks */}
      {hasSignals ? (
        <ul className="space-y-1.5">
          {fraud.signals.map((s) => (
            <li key={s.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink/80">
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
                  style={{ backgroundColor: s.hit ? "var(--color-danger)" : "var(--color-ok)" }}
                >
                  {s.hit ? "!" : "✓"}
                </span>
                {s.label}
              </span>
              <span className="text-xs font-medium" style={{ color: s.hit ? "var(--color-danger)" : "var(--color-ok)" }}>
                {s.hit ? "Flagged" : "Clear"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1.5">
          {fraud.topReasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-ink/80">
              <span
                className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full text-center text-[10px] leading-4 text-white"
                style={{ backgroundColor: fraud.level === "low" ? "var(--color-ok)" : color }}
              >
                {fraud.level === "low" ? "✓" : "!"}
              </span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
