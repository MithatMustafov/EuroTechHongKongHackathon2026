"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ComplianceResult, ComplianceCheck, CheckStatus, SanctionsScreen } from "@/lib/engine/types";

const MARK: Record<CheckStatus, { icon: string; color: string }> = {
  passed: { icon: "✓", color: "var(--color-ok)" },
  review: { icon: "⚠", color: "var(--color-warn)" },
  failed: { icon: "✕", color: "var(--color-danger)" },
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  passed: "Passed",
  review: "Review",
  failed: "Failed",
};

function isSanctions(c: ComplianceCheck) {
  return c.key === "SANCTIONS_SCREEN";
}

function canExpand(c: ComplianceCheck) {
  if (isSanctions(c) && c.meta?.screens?.length) return true;
  return c.status !== "passed" && !!c.detail;
}

export function ComplianceChecklist({ compliance }: { compliance: ComplianceResult }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ul className="space-y-1.5">
      {compliance.checks.map((c) => {
        const m = MARK[c.status];
        const isOpen = openKey === c.key;
        const expandable = canExpand(c);

        return (
          <li key={c.key}>
            <button
              type="button"
              disabled={!expandable}
              onClick={() => expandable && setOpenKey(isOpen ? null : c.key)}
              className="flex w-full items-center justify-between text-sm disabled:cursor-default"
            >
              <span className="flex items-center gap-2 text-ink/80">
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
                  style={{ backgroundColor: m.color }}
                >
                  {m.icon}
                </span>
                {c.label}
              </span>

              <span className="flex shrink-0 items-center gap-1">
                <span className="text-xs font-medium" style={{ color: m.color }}>
                  {STATUS_LABEL[c.status]}
                </span>
                {expandable && (
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[10px] text-muted leading-none"
                  >
                    ▾
                  </motion.span>
                )}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {isSanctions(c) ? (
                    <SanctionsDetail check={c} />
                  ) : (
                    <p className="mt-1.5 pl-6 text-xs leading-relaxed text-ink/60">{c.detail}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function ScreenRow({ screen, label }: { screen: SanctionsScreen; label?: string }) {
  const hit = screen.hits > 0;
  const [open, setOpen] = useState(false);
  const hasMatches = hit && (screen.matches?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] text-white"
            style={{ backgroundColor: hit ? "var(--color-danger)" : "var(--color-ok)" }}
          >
            {hit ? "✕" : "✓"}
          </span>
          <span className="truncate text-ink/70">{screen.entity}</span>
          {label && <span className="shrink-0 text-muted">({label})</span>}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span
            className="text-[10px] font-semibold"
            style={{ color: hit ? "var(--color-danger)" : "var(--color-ok)" }}
          >
            {hit ? `${screen.hits} hit${screen.hits > 1 ? "s" : ""}` : "Clear"}
          </span>
          {hasMatches && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-[9px] text-muted leading-none"
            >
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                ▾
              </motion.span>
            </button>
          )}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open && hasMatches && (
          <motion.ul
            key="matches"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden mt-1 ml-5 space-y-0.5"
          >
            {screen.matches!.map((m, i) => (
              <li key={i} className="text-[10px] text-danger/80 font-mono leading-snug">
                {m}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SanctionsDetail({ check }: { check: ComplianceCheck }) {
  const { meta } = check;
  const screens = meta?.screens ?? [];
  const pepScreens = meta?.pepScreens ?? [];
  const sourceList = meta?.source?.replace("local: ", "").split(" + ") ?? [];

  return (
    <div className="mt-2 pl-6 space-y-3">
      {/* Entity screens */}
      {screens.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Entities screened
          </p>
          <div className="space-y-1.5 text-xs">
            {screens.map((s) => (
              <ScreenRow key={s.entity} screen={s} />
            ))}
          </div>
        </div>
      )}

      {/* PEP screens (if any) */}
      {pepScreens.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            PEP screening
          </p>
          <div className="space-y-1.5 text-xs">
            {pepScreens.map((s) => (
              <ScreenRow key={s.entity} screen={s} label="PEP" />
            ))}
          </div>
        </div>
      )}

      {/* Lists checked */}
      {sourceList.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Lists checked
          </p>
          <ul className="space-y-0.5 text-xs text-ink/60">
            {sourceList.map((l) => (
              <li key={l} className="flex items-center gap-1.5">
                <span className="text-ok">·</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
