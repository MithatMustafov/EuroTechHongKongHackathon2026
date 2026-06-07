export type MoneyValue = {
  amount: number;
  currency: string;
  raw: string;
};

export type DateValue = {
  value: string;
  warning?: string;
};

const CURRENCY_ALIASES: Record<string, string> = {
  HKD: 'HKD',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CNY: 'CNY',
  RMB: 'CNY',
  CNH: 'CNH',
  JPY: 'JPY',
  SGD: 'SGD',
  AUD: 'AUD',
  CAD: 'CAD',
  CHF: 'CHF',
  DKK: 'DKK',
  SEK: 'SEK',
  NOK: 'NOK',
  INR: 'INR',
  KRW: 'KRW',
  THB: 'THB',
  IDR: 'IDR',
  MYR: 'MYR',
  PHP: 'PHP',
};

const CURRENCY_SYMBOLS: Array<[RegExp, string]> = [
  [/\bHK\$/i, 'HKD'],
  [/\bS\$/i, 'SGD'],
  [/\bA\$/i, 'AUD'],
  [/\bC\$/i, 'CAD'],
  [/\$/, 'USD'],
  [/€/, 'EUR'],
  [/£/, 'GBP'],
  [/[¥￥]/, 'CNY'],
  [/\bkr\b/i, 'SEK'],
  [/\b₹\b|₹/, 'INR'],
  [/\b₩\b|₩/, 'KRW'],
  [/\b฿\b|฿/, 'THB'],
];

const MONTHS: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const COUNTRY_ALIASES: Record<string, string> = {
  hk: 'Hong Kong',
  'hong kong': 'Hong Kong',
  cn: 'China',
  china: 'China',
  'mainland china': 'China',
  dk: 'Denmark',
  denmark: 'Denmark',
  de: 'Germany',
  germany: 'Germany',
  us: 'United States',
  usa: 'United States',
  'u.s.a.': 'United States',
  'united states': 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  gb: 'United Kingdom',
  'great britain': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  ireland: 'Ireland',
  france: 'France',
  italy: 'Italy',
  es: 'Spain',
  spain: 'Spain',
  portugal: 'Portugal',
  netherlands: 'Netherlands',
  belgium: 'Belgium',
  luxembourg: 'Luxembourg',
  switzerland: 'Switzerland',
  austria: 'Austria',
  sweden: 'Sweden',
  norway: 'Norway',
  finland: 'Finland',
  poland: 'Poland',
  czechia: 'Czechia',
  'czech republic': 'Czechia',
  hungary: 'Hungary',
  romania: 'Romania',
  greece: 'Greece',
  turkey: 'Turkey',
  israel: 'Israel',
  uae: 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  india: 'India',
  jp: 'Japan',
  japan: 'Japan',
  'south korea': 'South Korea',
  korea: 'South Korea',
  singapore: 'Singapore',
  sg: 'Singapore',
  malaysia: 'Malaysia',
  thailand: 'Thailand',
  indonesia: 'Indonesia',
  philippines: 'Philippines',
  vietnam: 'Vietnam',
  australia: 'Australia',
  'new zealand': 'New Zealand',
  canada: 'Canada',
  mexico: 'Mexico',
  brazil: 'Brazil',
  chile: 'Chile',
  argentina: 'Argentina',
  'south africa': 'South Africa',
};

const COMPOUND_WORD_CASING: Record<string, string> = {
  medtech: 'MedTech',
  fintech: 'FinTech',
  biotech: 'BioTech',
  greentech: 'GreenTech',
  microtech: 'MicroTech',
};

export function normalizeText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function toLines(text: string): string[] {
  return normalizeText(text).split('\n').map(cleanLine).filter(Boolean);
}

export function cleanLine(value: string): string {
  return value
    .replace(/^[:#\-\s]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[;,]+$/, '');
}

export function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeCurrency(value: string): string {
  return CURRENCY_ALIASES[value.trim().toUpperCase()] || '';
}

export function detectCurrency(text: string): string {
  const code = text.match(
    /\b(HKD|USD|EUR|GBP|CNY|RMB|CNH|JPY|SGD|AUD|CAD|CHF|DKK|SEK|NOK|INR|KRW|THB|IDR|MYR|PHP)\b/i,
  )?.[1];

  if (code) {
    return normalizeCurrency(code);
  }

  for (const [pattern, currency] of CURRENCY_SYMBOLS) {
    if (pattern.test(text)) {
      return currency;
    }
  }

  return '';
}

export function parseMoney(value: string): MoneyValue | undefined {
  const currency = detectCurrency(value);
  const amountMatch = value.match(
    /(?:[$€£¥￥₹₩฿]\s*)?([0-9]{1,3}(?:[,\s][0-9]{3})+|[0-9]+)(?:[.,]([0-9]{2}))?/,
  );

  if (!amountMatch) {
    return undefined;
  }

  const amount = Number.parseFloat(
    `${amountMatch[1].replace(/[,\s]/g, '')}.${amountMatch[2] || '0'}`,
  );

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  return {
    amount,
    currency,
    raw: value.trim(),
  };
}

export function normalizeDate(value: string): DateValue {
  const raw = cleanLine(value);

  if (!raw) {
    return { value: 'UNKNOWN' };
  }

  const iso = raw.match(/^([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})$/);

  if (iso) {
    return {
      value: [iso[1], iso[2].padStart(2, '0'), iso[3].padStart(2, '0')].join(
        '-',
      ),
    };
  }

  const dayMonthName = raw.match(
    /^([0-9]{1,2})\s+([A-Za-z]{3,})\.?,?\s+([0-9]{2,4})$/,
  );

  if (dayMonthName) {
    const month = MONTHS[dayMonthName[2].toLowerCase()];

    if (month) {
      return {
        value: [
          normalizeYear(dayMonthName[3]),
          month,
          dayMonthName[1].padStart(2, '0'),
        ].join('-'),
      };
    }
  }

  const monthNameDay = raw.match(
    /^([A-Za-z]{3,})\.?\s+([0-9]{1,2}),?\s+([0-9]{2,4})$/,
  );

  if (monthNameDay) {
    const month = MONTHS[monthNameDay[1].toLowerCase()];

    if (month) {
      return {
        value: [
          normalizeYear(monthNameDay[3]),
          month,
          monthNameDay[2].padStart(2, '0'),
        ].join('-'),
      };
    }
  }

  const numeric = raw.match(/^([0-9]{1,2})[-/.]([0-9]{1,2})[-/.]([0-9]{2,4})$/);

  if (numeric) {
    const left = Number.parseInt(numeric[1], 10);
    const middle = Number.parseInt(numeric[2], 10);
    const year = normalizeYear(numeric[3]);

    if (left > 12) {
      return {
        value: [
          year,
          numeric[2].padStart(2, '0'),
          numeric[1].padStart(2, '0'),
        ].join('-'),
      };
    }

    if (middle > 12) {
      return {
        value: [
          year,
          numeric[1].padStart(2, '0'),
          numeric[2].padStart(2, '0'),
        ].join('-'),
      };
    }

    return {
      value: raw,
      warning: `Ambiguous numeric date retained as "${raw}".`,
    };
  }

  return { value: raw };
}

export function addDays(isoDate: string, days: number): string {
  const match = isoDate.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);

  if (!match) {
    return 'UNKNOWN';
  }

  const date = new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10),
    ),
  );
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function normalizeCountry(value: string): string {
  const normalized = normalizeLabel(value);

  return COUNTRY_ALIASES[normalized] || '';
}

export function findCountryInText(value: string): string {
  for (const [alias, country] of Object.entries(COUNTRY_ALIASES).filter(
    ([alias]) => alias.length > 2,
  )) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');

    if (pattern.test(value)) {
      return country;
    }
  }

  for (const [alias, country] of Object.entries(COUNTRY_ALIASES).filter(
    ([alias]) => alias.length <= 2,
  )) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias.toUpperCase())}\\b`);

    if (pattern.test(value)) {
      return country;
    }
  }

  return '';
}

export function normalizeAccountNumber(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, '').trim();
}

export function normalizeCompanyName(value: string): string {
  const cleaned = cleanLine(value);
  const match = cleaned.match(
    /^(.+?(?:Pte\.?\s+Ltd\.?|Co\.?,?\s+Ltd\.?|Limited|Ltd\.?|GmbH|S\.L\.|ApS|AG|Inc\.?|LLC|PLC|S\.A\.|B\.V\.|KK|K\.K\.))(?:\b|,|$)/i,
  );

  return formatCompanyCasing(match ? cleanLine(match[1]) : cleaned);
}

export function countryFromEmail(email: string): string {
  const tld = email.toLowerCase().match(/\.([a-z]{2})(?:\W|$)/)?.[1] || '';

  return normalizeCountry(tld);
}

export function truncateRawText(value: string, maxLength = 2000): string {
  return normalizeText(value).slice(0, maxLength);
}

function normalizeYear(value: string): string {
  return value.length === 2 ? `20${value}` : value;
}

function formatCompanyCasing(value: string): string {
  const mostlyUppercase =
    value.replace(/[^A-Z]/g, '').length >
    value.replace(/[^a-z]/g, '').length * 2;
  const cased = mostlyUppercase
    ? value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : value;

  return cased
    .replace(/\b[A-Za-z]+\b/g, (word) => {
      return COMPOUND_WORD_CASING[word.toLowerCase()] || word;
    })
    .replace(/\bPte\.?\s+Ltd\.?$/i, 'Pte. Ltd.')
    .replace(/\bCo\.?,?\s+Ltd\.?$/i, 'Co., Ltd.')
    .replace(/\bS\.L\.?$/i, 'S.L.')
    .replace(/\bGmbh\b$/i, 'GmbH')
    .replace(/\bAps\b$/i, 'ApS')
    .replace(/\bAg\b$/i, 'AG')
    .replace(/\bLlc\b$/i, 'LLC')
    .replace(/\bPlc\b$/i, 'PLC')
    .replace(/\bK\.?K\.?$/i, 'K.K.');
}
