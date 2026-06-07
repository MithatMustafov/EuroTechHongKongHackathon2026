// Mock risk list of payment destinations (wallets / accounts).
export const RISKY_WALLETS: string[] = [
  "0xFAKE...",
  "0xBADWALLET01",
  "HK-MULE-99887766",
];

export function isRiskyDestination(dest: string): boolean {
  return RISKY_WALLETS.some((w) => w.toLowerCase() === dest.toLowerCase());
}
