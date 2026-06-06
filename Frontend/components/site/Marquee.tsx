const RAILS = [
  "FPS",
  "CHATS / RTGS",
  "CIPS / RMB",
  "SWIFT",
  "HKD Stablecoin",
  "HKMA-aligned",
];

export function Marquee() {
  const items = [...RAILS, ...RAILS];
  return (
    <section id="rails" className="relative overflow-hidden bg-gradient-to-r from-[#a78bfa] via-[#8b9cf6] to-[#7dd3fc] py-6">
      <div className="flex w-max animate-marquee items-center gap-12 px-6">
        {items.map((r, i) => (
          <span
            key={`${r}-${i}`}
            className="flex items-center gap-3 whitespace-nowrap text-xl font-bold text-white/90"
          >
            <span className="h-2 w-2 rounded-full bg-white/70" />
            {r}
          </span>
        ))}
      </div>
    </section>
  );
}
