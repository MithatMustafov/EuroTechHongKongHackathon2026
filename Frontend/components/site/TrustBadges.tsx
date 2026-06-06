"use client";

import { Reveal } from "./Reveal";

const BADGES = [
  {
    title: "Audited logic",
    body: "Deterministic, rule-based scoring and routing — every decision is explainable and reproducible.",
    icon: "✦",
  },
  {
    title: "Secure by design",
    body: "No funds are ever held or moved by Payrouter. We decide; your bank or rail executes.",
    icon: "🛡",
  },
  {
    title: "HK-compliant",
    body: "Built around HKMA-recognised rails and the 2025 stablecoin issuer regime.",
    icon: "✓",
  },
];

export function TrustBadges() {
  return (
    <section id="trust" className="mx-auto max-w-7xl px-5 py-16">
      <Reveal>
        <h2 className="display text-center text-3xl sm:text-4xl">Built to be trusted.</h2>
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {BADGES.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.08}>
            <div className="h-full rounded-3xl bg-white p-7 shadow-[0_18px_50px_-28px_rgba(80,70,120,0.5)] ring-1 ring-black/5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-lg text-white">
                {b.icon}
              </div>
              <h3 className="text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted">{b.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
