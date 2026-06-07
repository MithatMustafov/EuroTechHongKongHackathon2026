"use client";

import type { ComplianceResult, CheckStatus } from "@/lib/engine/types";

const MARK: Record<CheckStatus, { icon: string; color: string }> = {
  passed: { icon: "✓", color: "var(--color-ok)" },
  review: { icon: "⚠", color: "var(--color-warn)" },
  failed: { icon: "✕", color: "var(--color-danger)" },
};

export function ComplianceChecklist({ compliance }: { compliance: ComplianceResult }) {
  return (
    <ul className="space-y-2">
      {compliance.checks.map((c) => {
        const m = MARK[c.status];
        return (
          <li key={c.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink/80">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.icon}
              </span>
              {c.label}
            </span>
            <span className="text-right text-xs text-muted">{c.detail}</span>
          </li>
        );
      })}
    </ul>
  );
}
