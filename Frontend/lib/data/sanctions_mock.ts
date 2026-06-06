// Mock sanctions / restricted screening data.
export const SANCTIONED_NAMES: string[] = [
  "Red Star Trading DPRK",
  "Volga Shadow LLC",
];

export const SANCTIONED_COUNTRIES: string[] = [
  "North Korea",
  "Iran",
  "Syria",
];

// Goods descriptions that trigger enhanced review (dual-use / restricted).
export const RESTRICTED_GOODS_KEYWORDS: string[] = [
  "dual-use",
  "defense",
  "defence",
  "weapon",
  "munition",
  "restricted chemical",
  "high-risk technology",
];

export function isSanctioned(name: string, country: string, dest: string): boolean {
  const n = name.toLowerCase();
  const c = country.toLowerCase();
  const d = dest.toLowerCase();
  return (
    SANCTIONED_NAMES.some((s) => n.includes(s.toLowerCase())) ||
    SANCTIONED_COUNTRIES.some((s) => c.includes(s.toLowerCase())) ||
    SANCTIONED_NAMES.some((s) => d.includes(s.toLowerCase()))
  );
}

export function hasRestrictedGoods(goods: string): boolean {
  const g = goods.toLowerCase();
  return RESTRICTED_GOODS_KEYWORDS.some((k) => g.includes(k));
}
