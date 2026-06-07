"use client";

import { Logo } from "./Logo";

const LINKS = [
  { label: "Rails", href: "#rails" },
  { label: "How it works", href: "#features" },
  { label: "Compliance", href: "#trust" },
  { label: "FAQ", href: "#faq" },
];

export function Nav() {
  return (
    <header className="sticky top-3 z-40 px-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Logo pill */}
        <a
          href="#top"
          className="rounded-pill bg-white px-5 py-3 text-ink shadow-[0_6px_24px_rgba(80,70,120,0.12)]"
        >
          <Logo />
        </a>

        {/* Links pill */}
        <nav className="hidden items-center gap-1 rounded-pill bg-white/70 px-2 py-2 shadow-[0_6px_24px_rgba(80,70,120,0.10)] backdrop-blur lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-pill px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-bg hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA pills */}
        <div className="flex items-center gap-2">
          <a
            href="/demo"
            className="hidden rounded-pill bg-white px-5 py-3 text-sm font-semibold text-ink shadow-[0_6px_24px_rgba(80,70,120,0.10)] transition hover:-translate-y-0.5 sm:inline-block"
          >
            Try demo
          </a>
          <a
            href="/demo"
            className="rounded-pill bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
