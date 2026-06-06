import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row">
        <Logo />
        <p className="text-xs text-muted">
          Demo prototype · Payments are visualized, not executed · Not affiliated with any rail operator.
        </p>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Payrouter</p>
      </div>
    </footer>
  );
}
