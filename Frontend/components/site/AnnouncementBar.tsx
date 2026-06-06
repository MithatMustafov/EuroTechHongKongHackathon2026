export function AnnouncementBar() {
  return (
    <div className="relative z-50 w-full bg-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-2" />
        Hong Kong&apos;s stablecoin regime is live — Payrouter now routes across FPS, CHATS, CIPS, SWIFT &amp; HKD stablecoin.
        <a href="#widget" className="ml-1 hidden underline underline-offset-4 hover:opacity-80 sm:inline">
          Try the demo
        </a>
      </div>
    </div>
  );
}
