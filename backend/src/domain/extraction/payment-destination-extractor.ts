import type {
  PaymentDestination,
  RequestedMethod,
} from '../invoice/invoice.types';
import {
  findAllLabeledValues,
  findLabeledValue,
  findSectionBlock,
  firstRegexGroup,
} from './field-matching';
import {
  detectCurrency,
  normalizeAccountNumber,
  truncateRawText,
} from './normalizers';

const WALLET_PATTERN =
  /\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,80}|T[A-Za-z1-9]{33}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/;
const EMAIL_PATTERN = /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i;
const IBAN_PATTERN = /\b([A-Z]{2}[0-9]{2}[A-Z0-9]{11,30})\b/i;
const SWIFT_PATTERN = /\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/;
const PAYMENT_SECTION_LABELS = [
  'Payment Instructions',
  'Bank Details',
  'Remittance Details',
  'Wire Instructions',
  'International Wire Transfer Instructions',
  'Payment Details',
  'New Payment Instructions',
  'Bank Transfer Details - CHATS / RTGS',
  'Transfer Details - CHATS / RTGS',
];

export function detectRequestedMethod(
  text: string,
  lines: string[],
): RequestedMethod {
  const paymentText = getPaymentText(text, lines);

  if (
    WALLET_PATTERN.test(paymentText) ||
    /\b(stablecoin|usdc|usdt|hkd stablecoin|wallet|ethereum|polygon|solana|tron|base|arbitrum|optimism)\b/i.test(
      paymentText,
    )
  ) {
    return 'STABLECOIN';
  }

  if (
    /\b(fps|faster payment system|fps id|fps identifier|fps email proxy)\b/i.test(
      paymentText,
    )
  ) {
    return 'FPS';
  }

  if (
    /\b(cips|cnaps|cross-border.*(?:rmb|cny)|rmb \/ cny)\b/i.test(paymentText)
  ) {
    return 'CIPS';
  }

  if (
    /\b(chats|rtgs|hk clearing|clearing code|bank code|branch code)\b/i.test(
      paymentText,
    )
  ) {
    return 'CHATS_RTGS';
  }

  if (
    IBAN_PATTERN.test(paymentText) ||
    SWIFT_PATTERN.test(paymentText) ||
    /\b(swift|bic)\b/i.test(paymentText)
  ) {
    return 'SWIFT';
  }

  if (
    /\b(bank transfer|wire transfer|bank details|remittance details|beneficiary bank|account no|account number|routing number)\b/i.test(
      paymentText,
    )
  ) {
    return 'BANK_TRANSFER';
  }

  return 'UNKNOWN';
}

export function extractPaymentDestination(
  text: string,
  lines: string[],
  requestedMethod: RequestedMethod,
): PaymentDestination {
  const paymentText = getPaymentText(text, lines);

  switch (requestedMethod) {
    case 'STABLECOIN':   return extractStablecoinDestination(paymentText, lines);
    case 'FPS':          return extractFpsDestination(paymentText, lines);
    case 'CHATS_RTGS':   return extractChatsDestination(text, lines);
    case 'CIPS':         return extractCipsDestination(text, lines, paymentText);
    case 'SWIFT':        return extractSwiftDestination(text, lines, paymentText);
    case 'BANK_TRANSFER': return extractBankTransferDestination(text, lines);
    default:             return { raw_text: truncateRawText(paymentText || text) };
  }
}

// ── Per-rail extractors ───────────────────────────────────────────────────────

function extractStablecoinDestination(paymentText: string, lines: string[]): PaymentDestination {
  const tokenSymbol =
    firstRegexGroup(paymentText, /\bToken\s*[:#-]?\s*([A-Z][A-Z0-9]*)\b/i) ||
    firstRegexGroup(
      paymentText,
      /\b(mHKD|HKD|USDC|USDT|DAI|PYUSD|FDUSD|TUSD|EURC)\s+(?:stablecoin|token)\b/i,
    ) ||
    firstRegexGroup(
      paymentText,
      /\b(mHKD|USDC|USDT|DAI|PYUSD|FDUSD|TUSD|EURC)\b/i,
    );

  return {
    value:
      firstRegexGroup(paymentText, WALLET_PATTERN) ||
      findLabeledValue(lines, ['Wallet', 'Wallet Address', 'New wallet']) ||
      'UNKNOWN',
    network:
      findLabeledValue(lines, ['Network', 'Chain', 'Blockchain']) ||
      firstRegexGroup(
        paymentText,
        /\b(Ethereum(?: Sepolia)?|Polygon|Solana|Tron|Base|Arbitrum|Optimism|Avalanche|BSC|Binance Smart Chain)\b/i,
      ) ||
      'UNKNOWN',
    ...(tokenSymbol ? { token_symbol: tokenSymbol } : {}),
  };
}

function extractFpsDestination(paymentText: string, lines: string[]): PaymentDestination {
  const email =
    findLabeledValue(lines, ['FPS Email Proxy', 'FPS Email', 'Email Proxy']) ||
    firstRegexGroup(paymentText, EMAIL_PATTERN);
  const phone =
    findLabeledValue(lines, ['FPS Phone Proxy', 'Phone Proxy', 'Mobile Proxy']) ||
    firstRegexGroup(paymentText, /\b(?:phone|mobile)\s*[:#-]?\s*(\+?[0-9][0-9 -]{6,20})\b/i);

  return {
    fps_id:
      findLabeledValue(lines, ['FPS Identifier', 'FPS ID', 'FPS']) ||
      firstRegexGroup(paymentText, /\bFPS\s*(?:ID|Identifier)?\s*[:#-]?\s*([0-9-]{3,24})\b/i) ||
      undefined,
    proxy_type: email ? 'EMAIL' : phone ? 'PHONE' : undefined,
    proxy_value: email || phone || undefined,
  };
}

function extractChatsDestination(text: string, lines: string[]): PaymentDestination {
  const paymentText = getPaymentText(text, lines);
  return {
    bank_name: findBankName(text, lines) || 'UNKNOWN',
    account_number: findAccountNumber(text, lines, true) || 'UNKNOWN',
    bank_code:
      extractCode(findLabeledValue(lines, ['Bank Code', 'HK Bank Code']), /([0-9]{2,12})/) ||
      firstRegexGroup(paymentText, /\bbank code\s*[:#-]?\s*([0-9]{2,12})\b/i) ||
      undefined,
    branch_code:
      extractCode(findLabeledValue(lines, ['Branch Code', 'HK Branch Code']), /Branch Code\s*:\s*([0-9]{2,12})/i) ||
      extractCode(findLabeledValue(lines, ['Branch Code', 'HK Branch Code']), /^([0-9]{2,12})$/) ||
      firstRegexGroup(paymentText, /\bbranch code\s*[:#-]?\s*([0-9]{2,12})\b/i) ||
      undefined,
  };
}

function extractCipsDestination(text: string, lines: string[], paymentText: string): PaymentDestination {
  return {
    bank_name: findBankName(text, lines) || 'UNKNOWN',
    account_number: findAccountNumber(text, lines) || 'UNKNOWN',
    cnaps_code:
      findLabeledValue(lines, ['CNAPS / CIPS routing', 'CNAPS', 'CNAPS Code', 'CIPS routing', 'CIPS Code']) ||
      firstRegexGroup(paymentText, /\b(?:cnaps|cips)\s*(?:routing|code|id)?\s*[:#-]?\s*([A-Z0-9]{6,20})\b/i) ||
      undefined,
  };
}

function extractSwiftDestination(text: string, lines: string[], paymentText: string): PaymentDestination {
  const iban =
    findLabeledValue(lines, ['IBAN']) ||
    firstRegexGroup(paymentText, IBAN_PATTERN);
  const accountNumber = findAccountNumber(text, lines);
  const bankName = findBankName(text, lines);

  return {
    ...(iban ? { iban } : {}),
    ...(accountNumber ? { account_number: accountNumber } : {}),
    swift_bic:
      findLabeledValue(lines, ['SWIFT/BIC', 'SWIFT', 'BIC']) ||
      firstRegexGroup(paymentText, SWIFT_PATTERN) ||
      'UNKNOWN',
    ...(bankName ? { bank_name: bankName } : {}),
  };
}

function extractBankTransferDestination(text: string, lines: string[]): PaymentDestination {
  return {
    bank_name: findBankName(text, lines) || 'UNKNOWN',
    account_number: findAccountNumber(text, lines) || 'UNKNOWN',
    bank_code:
      findLabeledValue(lines, ['Bank Code', 'Routing Number', 'Sort Code', 'ABA']) || undefined,
    branch_code: findLabeledValue(lines, ['Branch Code']) || undefined,
  };
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function findPaymentBeneficiary(
  lines: string[],
  requestedMethod: RequestedMethod,
): string {
  if (requestedMethod === 'STABLECOIN') {
    const alternativeAccount = findLabeledValue(lines, ['Alternative receiving account']);
    const alternativeName = alternativeAccount.split(',')[0]?.trim();
    if (alternativeName) return alternativeName;
  }

  return findLabeledValue(lines, [
    'Beneficiary name',
    'Beneficiary',
    'Payee',
    'Account Name',
    'Account Holder',
  ]);
}

export function findBankName(text: string, lines: string[]): string {
  const labeled =
    findAllLabeledValues(lines, [
      'Beneficiary Bank',
      'Bank Name',
      'Receiving Bank',
      'Bank',
      'Financial Institution',
    ]).find((value) => !isInvalidBankName(value)) || '';

  if (labeled) return labeled;

  const regexBank = firstRegexGroup(
    text,
    /\b(?:bank|beneficiary bank)\s*[:#-]?\s*([^\n]{3,120})/i,
  );

  return isInvalidBankName(regexBank) ? '' : regexBank;
}

export function findAccountNumber(
  text: string,
  lines: string[],
  preserveFormatting = false,
): string {
  const labeled = findLabeledValue(lines, [
    'Account No.',
    'Account No',
    'Account Number',
    'A/C No.',
    'Acct No.',
    'Beneficiary Account',
  ]);

  const raw =
    labeled ||
    firstRegexGroup(
      text,
      /\b(?:account number|account no\.?|a\/c no\.?|acct\.?)\s*[:#-]?\s*([A-Z0-9 -]{5,34})\b/i,
    );

  return preserveFormatting ? raw.trim() : normalizeAccountNumber(raw);
}

function getPaymentText(text: string, lines: string[]): string {
  const paymentBlock = findSectionBlock(lines, PAYMENT_SECTION_LABELS, 18);
  if (paymentBlock.length > 0) return paymentBlock.join('\n');

  const bankValues = findAllLabeledValues(lines, [
    'Beneficiary Bank', 'Bank', 'Account No', 'IBAN', 'SWIFT/BIC', 'SWIFT', 'BIC', 'FPS ID', 'CNAPS',
  ]);

  return bankValues.length > 0 ? bankValues.join('\n') : text;
}

function extractCode(value: string, pattern: RegExp): string {
  return value.match(pattern)?.[1] || '';
}

function isInvalidBankName(value: string): boolean {
  return /^(transfer details|payment details|bank transfer instructions|chats \/ rtgs|code\b|details\b)/i.test(
    value.trim(),
  );
}

export function inferPaymentCurrency(text: string): string {
  return detectCurrency(text) || 'UNKNOWN';
}
