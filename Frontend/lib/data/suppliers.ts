import type { Supplier } from "@/lib/engine/types";

// Mock supplier registry. A supplier absent here is treated as "new".
export const SUPPLIERS: Supplier[] = [
  {
    name: "Berlin Components GmbH",
    country: "Germany",
    expectedDomain: "berlin-components.com",
    verifiedDestinations: ["0xSAFE...", "DE89370400440532013000"],
    typicalAmount: 40000,
    verifiedStablecoinWallet: true,
    stablecoinLimit: 100000,
  },
  {
    name: "Kowloon Office Supplies Ltd.",
    country: "Hong Kong",
    expectedDomain: "kowloon-supplies.hk",
    verifiedDestinations: ["office@kowloon-supplies.hk"],
    typicalAmount: 9000,
    verifiedStablecoinWallet: false,
    stablecoinLimit: 0,
  },
  {
    name: "Shenzhen Precision Manufacturing Co.",
    country: "Mainland China",
    expectedDomain: "sz-precision.cn",
    verifiedDestinations: ["CN-RMB-6228480402564890018"],
    typicalAmount: 180000,
    verifiedStablecoinWallet: false,
    stablecoinLimit: 0,
  },
];

export function findSupplier(name: string): Supplier | undefined {
  return SUPPLIERS.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
