import { cn } from "@/lib/utils";

/** Payrouter wordmark: two converging "rails" merging into a routed node. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 6h7c4 0 4 6 8 6h3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M3 18h7c4 0 4-6 8-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
        <circle cx="20.5" cy="12" r="2.4" fill="currentColor" />
      </svg>
      <span className="text-[1.15rem]">Payrouter</span>
    </span>
  );
}
