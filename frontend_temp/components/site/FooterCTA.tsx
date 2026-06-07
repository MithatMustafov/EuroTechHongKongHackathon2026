"use client";

import { Reveal } from "./Reveal";

export function FooterCTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-10">
      <Reveal>
        <div className="relative overflow-hidden rounded-[36px] bg-ink px-8 py-20 text-center">
          <div className="pointer-events-none absolute inset-0 -z-0 opacity-60">
            <div className="animate-blob absolute -left-10 top-0 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
            <div className="animate-blob animation-delay-2 absolute right-0 bottom-0 h-80 w-80 rounded-full bg-brand-2/40 blur-3xl" />
          </div>
          <h2 className="display relative text-5xl text-white sm:text-6xl">
            Upload. Decide. Pay safely.
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-white/70">
            The decision layer between every invoice and every payment rail in Hong Kong.
          </p>
          <a
            href="/demo"
            className="relative mt-8 inline-block rounded-pill bg-white px-7 py-3.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5"
          >
            Route your first invoice
          </a>
        </div>
      </Reveal>
    </section>
  );
}
