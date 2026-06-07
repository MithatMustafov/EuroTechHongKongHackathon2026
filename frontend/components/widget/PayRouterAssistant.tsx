"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Decision } from "@/lib/engine/types";
import { getAuditSummary } from "@/lib/api/backend";

type Status = "loading" | "ready" | "error";

interface Props {
  decision: Decision;
  onSummaryReady?: (summary: string) => void;
}

export function PayRouterAssistant({ decision, onSummaryReady }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSummary("");

    getAuditSummary(decision)
      .then((text) => {
        if (!cancelled) {
          setSummary(text);
          setStatus("ready");
          onSummaryReady?.(text);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => { cancelled = true; };
  }, [decision]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Section header — identical to other sections in the widget */}
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Audit summary
      </h4>

      <div className="rounded-2xl border border-line bg-white px-3.5 py-3">
        {/* Source row */}
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-2" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            PayRouter AI
          </span>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Dots />
              <span className="text-sm text-muted">Generating summary…</span>
            </motion.div>
          )}

          {status === "ready" && (
            <motion.p
              key="ready"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm leading-relaxed text-ink/80"
            >
              {summary}
            </motion.p>
          )}

          {status === "error" && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm italic text-muted"
            >
              Summary unavailable.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-brand-2"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
