"use client";

import { cn } from "@/lib/utils";
import type { RailOption } from "@/lib/engine/types";

const STATUS_STYLE: Record<RailOption["status"], string> = {
  recommended: "border-ink bg-ink text-white",
  available: "border-line bg-white text-ink",
  not_suitable: "border-line bg-bg text-muted",
};

const STATUS_LABEL: Record<RailOption["status"], string> = {
  recommended: "Recommended",
  available: "Available",
  not_suitable: "Not suitable",
};

function fmtHkd(n: number) {
  if (n === 0) return "Free";
  return `HK$${n.toLocaleString()}`;
}

export function RailCard({ option }: { option: RailOption }) {
  const { cost } = option;
  const isRecommended = option.status === "recommended";
  const dimText = isRecommended ? "text-white/70" : "text-muted";
  const divider = isRecommended ? "border-white/15" : "border-line";

  return (
    <div className={cn("rounded-2xl border p-3 transition", STATUS_STYLE[option.status])}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{option.label}</span>
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isRecommended
              ? "bg-brand-2 text-white"
              : option.status === "available"
                ? "bg-bg text-ink/70"
                : "bg-line text-muted",
          )}
        >
          {STATUS_LABEL[option.status]}
        </span>
      </div>

      <p className={cn("mt-1 text-xs", dimText)}>{option.reason}</p>

      {cost && (
        <div className={cn("mt-2 border-t pt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs", divider)}>
          <span className={dimText}>Est. cost</span>
          <span className="text-right font-medium">
            {cost.totalMin === cost.totalMax
              ? fmtHkd(cost.totalMin)
              : `${fmtHkd(cost.totalMin)} – ${fmtHkd(cost.totalMax)}`}
          </span>

          <span className={dimText}>Settlement</span>
          <span className="text-right font-medium">{cost.settlementTime}</span>

          {cost.fxMarkupPct > 0 && (
            <>
              <span className={dimText}>FX markup</span>
              <span className="text-right font-medium">{cost.fxMarkupPct}%</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
