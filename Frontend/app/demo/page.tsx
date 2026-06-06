import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { DecisionWidget } from "@/components/widget/DecisionWidget";

export const metadata: Metadata = {
  title: "Payrouter Demo — Route an invoice",
  description:
    "Try Payrouter: pick a supplier invoice and watch fraud, compliance and rail-routing run before money moves.",
};

const STEPS = ["Pick invoice", "Fraud + compliance", "Rail decision", "Pay & receipt"];

export default function DemoPage() {
  return (
    <div id="top" className="relative min-h-screen overflow-hidden">
      {/* drifting gradient blobs — same language as the landing hero */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -left-24 top-0 h-96 w-96 rounded-full bg-lilac opacity-60 blur-3xl" />
        <div className="animate-blob animation-delay-2 absolute right-0 top-10 h-[28rem] w-[28rem] rounded-full bg-peach opacity-50 blur-3xl" />
        <div className="animate-blob animation-delay-4 absolute left-1/3 top-52 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
      </div>

      <Nav />

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:pt-14">
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink"
          >
            ← Back to home
          </a>
          <h1 className="display mt-5 text-5xl sm:text-6xl">Route an invoice</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Pick a sample invoice below. Payrouter scores fraud, runs compliance checks, and
            recommends the safest payment rail — before any money moves.
          </p>

          {/* step strip */}
          <ol className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs font-semibold text-ink/70">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-pill bg-white px-3 py-1.5 shadow-sm">
                  {i + 1}. {s}
                </span>
                {i < STEPS.length - 1 && <span className="text-muted">→</span>}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10">
          <DecisionWidget wide />
        </div>
      </main>
    </div>
  );
}
