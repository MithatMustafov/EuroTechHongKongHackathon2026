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

export function RailCard({ option }: { option: RailOption }) {
  return (
    <div className={cn("rounded-2xl border p-3 transition", STATUS_STYLE[option.status])}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{option.label}</span>
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            option.status === "recommended"
              ? "bg-brand-2 text-white"
              : option.status === "available"
                ? "bg-bg text-ink/70"
                : "bg-line text-muted",
          )}
        >
          {STATUS_LABEL[option.status]}
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-xs",
          option.status === "recommended" ? "text-white/75" : "text-muted",
        )}
      >
        {option.reason}
      </p>
    </div>
  );
}
