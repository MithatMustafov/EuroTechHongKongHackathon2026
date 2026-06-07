/**
 * Single source of truth for jurisdiction country data and country-comparison
 * helpers. Previously spread across three locations:
 *   - compliance/checks/jurisdiction.check.ts  (APPROVED / RESTRICTED sets)
 *   - rail-decision/rail-decision.service.ts   (normalizeCountry / isHongKong / isChina)
 *   - extraction/normalizers.ts                (COUNTRY_ALIASES — kept there for extraction use)
 */

export const APPROVED_JURISDICTIONS = new Set([
  'Hong Kong', 'China', 'Singapore', 'Japan', 'South Korea', 'Taiwan',
  'Australia', 'New Zealand', 'United States', 'Canada',
  'United Kingdom', 'Germany', 'France', 'Netherlands', 'Switzerland',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Austria', 'Belgium',
  'Luxembourg', 'Ireland', 'Spain', 'Italy', 'Portugal', 'Poland',
  'Czech Republic', 'United Arab Emirates', 'Israel', 'India',
  'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines',
]);

export const RESTRICTED_JURISDICTIONS = new Set([
  'Russia', 'Belarus', 'Iran', 'North Korea', 'Syria',
  'Cuba', 'Venezuela', 'Myanmar', 'Sudan', 'Zimbabwe',
  'Libya', 'Somalia', 'Yemen', 'Afghanistan',
]);

/** Normalise a country string for equality comparisons (uppercase, trimmed). */
export function normalizeJurisdictionCountry(country: string): string {
  return country.trim().toUpperCase();
}

export function isHongKong(country: string): boolean {
  const c = normalizeJurisdictionCountry(country);
  return c === 'HK' || c === 'HONG KONG';
}

export function isChina(country: string): boolean {
  const c = normalizeJurisdictionCountry(country);
  return (
    c === 'CN' ||
    c === 'CHINA' ||
    c === 'MAINLAND CHINA' ||
    c === "PEOPLE'S REPUBLIC OF CHINA"
  );
}
