import { Injectable } from '@nestjs/common';
import { inflateSync } from 'node:zlib';
import type {
  Invoice,
  PaymentDestination,
  RequestedMethod,
} from '../common/types/invoice.types';

@Injectable()
export class ExtractionService {
  async extractInvoiceFromPdf(pdf: Uint8Array): Promise<Invoice> {
    const text = normalizeText(extractTextFromPdf(pdf));
    const lines = getTextLines(text);
    const requestedMethod = detectRequestedMethod(text);
    const supplierName =
      findSectionName(lines, 'FROM') ||
      findLabelValue(text, ['supplier', 'vendor', 'seller', 'from']);
    const payerName =
      findSectionName(lines, 'BILL TO') ||
      findLabelValue(text, [
        'payer',
        'customer',
        'buyer',
        'bill to',
        'invoice to',
      ]);
    const supplierEmail =
      findEmailInSection(lines, 'FROM') ||
      firstMatch(text, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
    const beneficiaryName =
      findPaymentBeneficiary(lines, requestedMethod) ||
      findLabelLineValue(lines, ['Beneficiary name', 'Beneficiary', 'Payee']) ||
      findLabelValue(text, ['beneficiary name', 'beneficiary', 'payee']) ||
      supplierName;
    const totalDue = findLabelLineValue(lines, ['Total Due']);

    return {
      invoice_number:
        findLabelLineValue(lines, ['Invoice No.', 'Invoice No', 'Invoice #']) ||
        firstMatch(
          text,
          /\b(?:invoice|inv)\s*(?:number|no\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]*)\b/i,
        ) ||
        'UNKNOWN',
      due_date:
        normalizeDate(
          findLabelLineValue(lines, ['Due Date', 'Payment Due', 'Pay By']) ||
            firstMatch(
              text,
              /\b(?:due date|payment due|pay by)\s*[:#-]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Z][a-z]+\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
            ) ||
            firstMatch(text, /\b([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})\b/) ||
            '',
        ) || 'UNKNOWN',
      payer: {
        name: payerName || 'UNKNOWN',
        country:
          findCountryInSection(lines, 'BILL TO') ||
          findCountryNearLabel(text, ['payer', 'customer', 'buyer']) ||
          'UNKNOWN',
      },
      supplier: {
        name: supplierName || 'UNKNOWN',
        country:
          findCountryInSection(lines, 'FROM') ||
          findCountryNearLabel(text, ['supplier', 'vendor', 'seller']) ||
          'UNKNOWN',
        email: supplierEmail || undefined,
      },
      payment: {
        amount: findAmount(text, totalDue),
        currency: findCurrency(text, totalDue),
        purpose:
          findLabelLineValue(lines, ['Purpose code', 'Purpose']) ||
          findProjectPurpose(lines) ||
          findLabelValue(text, [
            'purpose',
            'description',
            'payment for',
            'memo',
            'reference',
          ]) ||
          'UNKNOWN',
        requested_method: requestedMethod,
        beneficiary_name: beneficiaryName || 'UNKNOWN',
        destination: buildDestination(text, lines, requestedMethod),
      },
      risk_signals: {
        urgency_language:
          /\b(urgent|immediately|asap|right away|today only)\b/i.test(text),
        pressure_language:
          /\b(final notice|avoid penalties|avoid shipment cancellation|shipment cancellation|must pay|do not delay|overdue|same-day confirmation)\b/i.test(
            text,
          ),
        secrecy_language:
          /\b(confidential|do not share|keep this between us|secret|do not call|reply only)\b/i.test(
            text,
          ),
        payment_details_changed:
          /\b(new payment details|payment details have changed|updated bank details|changed account|use this account instead|replaces all previous payment instructions)\b/i.test(
            text,
          ),
      },
    };
  }
}

type PdfStream = {
  dictionary: string;
  bytes: Uint8Array;
};

const latin1Decoder = new TextDecoder('latin1');
const utf8Decoder = new TextDecoder('utf-8');

function extractTextFromPdf(pdf: Uint8Array): string {
  const binary = latin1Decoder.decode(pdf);
  const streams = extractPdfStreams(binary, pdf);
  const textChunks = [extractPdfTextOperators(binary)];
  const readableChunks = [extractReadableText(binary)];

  for (const stream of streams) {
    const streamBytes = decodePdfStream(stream);
    const streamText = latin1Decoder.decode(streamBytes);
    textChunks.push(extractPdfTextOperators(streamText));
    readableChunks.push(extractReadableText(streamText));
  }

  const text = textChunks.filter(Boolean).join('\n');

  if (text.trim()) {
    return text;
  }

  return readableChunks.filter(Boolean).join('\n');
}

function extractPdfStreams(binary: string, pdf: Uint8Array): PdfStream[] {
  const streams: PdfStream[] = [];
  let searchFrom = 0;

  while (searchFrom < binary.length) {
    const streamKeywordIndex = binary.indexOf('stream', searchFrom);

    if (streamKeywordIndex === -1) {
      break;
    }

    let streamStart = streamKeywordIndex + 'stream'.length;

    if (binary[streamStart] === '\r' && binary[streamStart + 1] === '\n') {
      streamStart += 2;
    } else if (binary[streamStart] === '\n' || binary[streamStart] === '\r') {
      streamStart += 1;
    }

    const streamEnd = binary.indexOf('endstream', streamStart);

    if (streamEnd === -1) {
      break;
    }

    const dictionaryStart = binary.lastIndexOf('<<', streamKeywordIndex);
    const dictionaryEnd = binary.lastIndexOf('>>', streamKeywordIndex);
    const dictionary =
      dictionaryStart !== -1 && dictionaryEnd > dictionaryStart
        ? binary.slice(dictionaryStart, dictionaryEnd + 2)
        : '';

    streams.push({
      dictionary,
      bytes: pdf.slice(streamStart, trimStreamEnd(binary, streamEnd)),
    });

    searchFrom = streamEnd + 'endstream'.length;
  }

  return streams;
}

function trimStreamEnd(binary: string, streamEnd: number): number {
  if (binary[streamEnd - 2] === '\r' && binary[streamEnd - 1] === '\n') {
    return streamEnd - 2;
  }

  if (binary[streamEnd - 1] === '\n' || binary[streamEnd - 1] === '\r') {
    return streamEnd - 1;
  }

  return streamEnd;
}

function decodePdfStream(stream: PdfStream): Uint8Array {
  const filters = findStreamFilters(stream.dictionary);
  let bytes = stream.bytes;

  for (const filter of filters) {
    try {
      if (filter === 'ASCII85Decode' || filter === 'A85') {
        bytes = decodeAscii85(bytes);
      } else if (filter === 'FlateDecode' || filter === 'Fl') {
        bytes = inflateSync(bytes);
      }
    } catch {
      return stream.bytes;
    }
  }

  return bytes;
}

function findStreamFilters(dictionary: string): string[] {
  const filterSection = dictionary.match(
    /\/Filter\s*(\[[^\]]+\]|\/[A-Za-z0-9]+)/,
  );

  if (!filterSection) {
    return [];
  }

  return [...filterSection[1].matchAll(/\/([A-Za-z0-9]+)/g)].map(
    (match) => match[1],
  );
}

function decodeAscii85(bytes: Uint8Array): Uint8Array {
  const encoded = latin1Decoder
    .decode(bytes)
    .replace(/^<~/, '')
    .replace(/~>[\s\S]*$/, '')
    .replace(/\s/g, '');
  const decoded: number[] = [];
  let group = '';

  for (const char of encoded) {
    if (char === 'z' && group.length === 0) {
      decoded.push(0, 0, 0, 0);
      continue;
    }

    group += char;

    if (group.length === 5) {
      decoded.push(...decodeAscii85Group(group, 4));
      group = '';
    }
  }

  if (group.length > 0) {
    const outputLength = group.length - 1;
    decoded.push(...decodeAscii85Group(group.padEnd(5, 'u'), outputLength));
  }

  return new Uint8Array(decoded);
}

function decodeAscii85Group(group: string, outputLength: number): number[] {
  let value = 0;

  for (const char of group) {
    value = value * 85 + (char.charCodeAt(0) - 33);
  }

  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].slice(0, outputLength);
}

function extractPdfTextOperators(content: string): string {
  const chunks: string[] = [];
  const operatorPattern =
    /(\((?:\\.|[^\\()])*\)|<[\dA-Fa-f\s]+>|\[(?:\s*(?:\((?:\\.|[^\\()])*\)|<[\dA-Fa-f\s]+>|-?\d+(?:\.\d+)?)\s*)+\])\s*(?:Tj|'|"|TJ)\b/g;
  let match: RegExpExecArray | null;

  while ((match = operatorPattern.exec(content)) !== null) {
    chunks.push(decodePdfTextToken(match[1]));
  }

  return chunks.join('\n');
}

function decodePdfTextToken(token: string): string {
  if (token.startsWith('[')) {
    const innerTokens =
      token.match(/\((?:\\.|[^\\()])*\)|<[\dA-Fa-f\s]+>/g) || [];

    return innerTokens.map(decodePdfTextToken).join('');
  }

  if (token.startsWith('<')) {
    return decodeHexPdfString(token);
  }

  return decodeLiteralPdfString(token);
}

function decodeLiteralPdfString(token: string): string {
  const value = token.slice(1, -1);

  return value.replace(
    /\\([nrtbf()\\]|[0-7]{1,3}|\r?\n|\r)/g,
    (_match: string, escaped: string) => {
      if (escaped === 'n') {
        return '\n';
      }
      if (escaped === 'r') {
        return '\r';
      }
      if (escaped === 't') {
        return '\t';
      }
      if (escaped === 'b') {
        return '\b';
      }
      if (escaped === 'f') {
        return '\f';
      }
      if (/^[0-7]{1,3}$/.test(escaped)) {
        return String.fromCharCode(Number.parseInt(escaped, 8));
      }
      if (escaped === '\n' || escaped === '\r' || escaped === '\r\n') {
        return '';
      }

      return escaped;
    },
  );
}

function decodeHexPdfString(token: string): string {
  const hex = token.slice(1, -1).replace(/\s/g, '');
  const paddedHex = hex.length % 2 === 0 ? hex : `${hex}0`;
  const bytes = new Uint8Array(paddedHex.length / 2);

  for (let index = 0; index < paddedHex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(paddedHex.slice(index, index + 2), 16);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16Be(bytes.slice(2));
  }

  return utf8Decoder.decode(bytes);
}

function decodeUtf16Be(bytes: Uint8Array): string {
  let text = '';

  for (let index = 0; index + 1 < bytes.length; index += 2) {
    text += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }

  return text;
}

function extractReadableText(content: string): string {
  return content
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function getTextLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => cleanValue(line))
    .filter(Boolean);
}

function firstMatch(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1]?.trim() || '';
}

function findLabelLineValue(lines: string[], labels: string[]): string {
  for (const label of labels) {
    const normalizedLabel = normalizeLabel(label);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const normalizedLine = normalizeLabel(line);

      if (normalizedLine === normalizedLabel) {
        return lines[index + 1] || '';
      }

      if (normalizedLine.startsWith(`${normalizedLabel} `)) {
        return cleanValue(line.slice(label.length));
      }
    }
  }

  return '';
}

function findSectionName(lines: string[], sectionLabel: string): string {
  const sectionIndex = findLineIndex(lines, sectionLabel);

  if (sectionIndex === -1) {
    return '';
  }

  return lines[sectionIndex + 1] || '';
}

function findEmailInSection(lines: string[], sectionLabel: string): string {
  const sectionIndex = findLineIndex(lines, sectionLabel);

  if (sectionIndex === -1) {
    return '';
  }

  for (const line of lines.slice(sectionIndex + 1, sectionIndex + 8)) {
    const email = firstMatch(
      line,
      /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i,
    );

    if (email) {
      return email;
    }
  }

  return '';
}

function findCountryInSection(lines: string[], sectionLabel: string): string {
  const sectionIndex = findLineIndex(lines, sectionLabel);

  if (sectionIndex === -1) {
    return '';
  }

  for (const line of lines.slice(sectionIndex + 1, sectionIndex + 8)) {
    const country = findKnownCountry(line);

    if (country) {
      return country;
    }
  }

  return '';
}

function findProjectPurpose(lines: string[]): string {
  const sectionIndex = findLineIndex(lines, 'SHIP TO / PROJECT');

  if (sectionIndex === -1) {
    return '';
  }

  const candidate = lines[sectionIndex + 2] || '';

  if (/^(delivery|incoterms|ap contact)\b/i.test(candidate)) {
    return '';
  }

  return candidate;
}

function findPaymentBeneficiary(
  lines: string[],
  requestedMethod: RequestedMethod,
): string {
  if (requestedMethod === 'STABLECOIN') {
    const alternativeAccount = findLabelLineValue(lines, [
      'Alternative receiving account',
    ]);
    const alternativeName = alternativeAccount.split(',')[0]?.trim();

    if (alternativeName) {
      return alternativeName;
    }
  }

  return findLabelLineValue(lines, [
    'Beneficiary name',
    'Beneficiary',
    'Payee',
  ]);
}

function findLineIndex(lines: string[], label: string): number {
  const normalizedLabel = normalizeLabel(label);

  return lines.findIndex((line) => normalizeLabel(line) === normalizedLabel);
}

function normalizeLabel(value: string): string {
  return value
    .replace(/[:.#-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findKnownCountry(value: string): string {
  const countries = ['Hong Kong', 'Denmark', 'Germany', 'China'];

  return (
    countries.find((country) =>
      new RegExp(`\\b${country}\\b`, 'i').test(value),
    ) || ''
  );
}

function findLabelValue(text: string, labels: string[]): string {
  for (const label of labels) {
    const escapedLabel = escapeRegExp(label);
    const match = text.match(
      new RegExp(`\\b${escapedLabel}\\b\\s*[:#-]?\\s*([^\\n|,;]{2,120})`, 'i'),
    );

    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return '';
}

function findCountryNearLabel(text: string, labels: string[]): string {
  for (const label of labels) {
    const escapedLabel = escapeRegExp(label);
    const match = text.match(
      new RegExp(
        `\\b${escapedLabel}\\b[\\s\\S]{0,160}\\b(?:country)\\s*[:#-]?\\s*([A-Z]{2}|[A-Z][A-Za-z ]{3,40})`,
        'i',
      ),
    );

    if (match?.[1]) {
      return cleanValue(match[1]).toUpperCase();
    }
  }

  return firstMatch(text, /\b(?:country)\s*[:#-]?\s*([A-Z]{2})\b/i);
}

function normalizeDate(value: string): string {
  if (!value) {
    return '';
  }

  const normalized = value.trim().replace(/\./g, '-').replace(/\//g, '-');
  const isoMatch = normalized.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/);

  if (isoMatch) {
    return [
      isoMatch[1],
      isoMatch[2].padStart(2, '0'),
      isoMatch[3].padStart(2, '0'),
    ].join('-');
  }

  const dayFirstMatch = normalized.match(
    /^([0-9]{1,2})-([0-9]{1,2})-([0-9]{2,4})$/,
  );

  if (dayFirstMatch) {
    const year =
      dayFirstMatch[3].length === 2
        ? `20${dayFirstMatch[3]}`
        : dayFirstMatch[3];

    return [
      year,
      dayFirstMatch[2].padStart(2, '0'),
      dayFirstMatch[1].padStart(2, '0'),
    ].join('-');
  }

  const monthNameMatch = value
    .trim()
    .match(/^([0-9]{1,2})\s+([A-Za-z]{3,})\.?\s+([0-9]{4})$/);

  if (monthNameMatch) {
    const month = monthNumber(monthNameMatch[2]);

    if (month) {
      return [
        monthNameMatch[3],
        month,
        monthNameMatch[1].padStart(2, '0'),
      ].join('-');
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.trim();
  }

  return date.toISOString().slice(0, 10);
}

function monthNumber(value: string): string {
  const months: Record<string, string> = {
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
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12',
  };

  return months[value.toLowerCase()] || '';
}

function findAmount(text: string, preferredAmountText = ''): number {
  const amount =
    firstMatch(preferredAmountText, /\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/) ||
    firstMatch(
      text,
      /\b(?:amount due|total due|invoice total|total|amount)\s*[:#-]?\s*(?:[A-Z]{3}|RMB|[$€£¥])?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
    ) ||
    firstMatch(text, /\b[A-Z]{3}\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);

  return amount ? Number.parseFloat(amount.replace(/,/g, '')) : 0;
}

function findCurrency(text: string, preferredAmountText = ''): string {
  const currency =
    firstMatch(
      preferredAmountText,
      /\b(HKD|USD|EUR|DKK|CNY|CNH|RMB|GBP|JPY|SGD|AUD|CAD)\b/i,
    ) ||
    firstMatch(
      text,
      /\b(?:currency|settlement currency)\s*[:#-]?\s*(HKD|USD|EUR|DKK|CNY|CNH|RMB|GBP|JPY|SGD|AUD|CAD)\b/i,
    ) ||
    firstMatch(
      text,
      /\b(HKD|USD|EUR|DKK|CNY|CNH|RMB|GBP|JPY|SGD|AUD|CAD)\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?\b/i,
    ) ||
    detectCurrencySymbol(text);

  if (!currency) {
    return 'UNKNOWN';
  }

  return currency.toUpperCase() === 'RMB' ? 'CNY' : currency.toUpperCase();
}

function detectCurrencySymbol(text: string): string {
  if (/\bHK\$/.test(text)) {
    return 'HKD';
  }
  if (/\$/.test(text)) {
    return 'USD';
  }
  if (/€/.test(text)) {
    return 'EUR';
  }
  if (/£/.test(text)) {
    return 'GBP';
  }
  if (/¥/.test(text)) {
    return 'CNY';
  }

  return '';
}

function detectRequestedMethod(text: string): RequestedMethod {
  if (
    /\b(stablecoin|wallet|usdc|usdt|ethereum|sepolia|polygon|solana)\b/i.test(
      text,
    )
  ) {
    return 'STABLECOIN';
  }
  if (/\b(fps|faster payment system)\b/i.test(text)) {
    return 'FPS';
  }
  if (/\b(chats|rtgs)\b/i.test(text)) {
    return 'CHATS_RTGS';
  }
  if (/\b(cips|cnaps|cross-border interbank payment)\b/i.test(text)) {
    return 'CIPS';
  }
  if (/\b(swift|bic|iban)\b/i.test(text)) {
    return 'SWIFT';
  }
  if (
    /\b(bank transfer|wire transfer|bank account|account number)\b/i.test(text)
  ) {
    return 'BANK_TRANSFER';
  }

  return 'UNKNOWN';
}

function buildDestination(
  text: string,
  lines: string[],
  requestedMethod: RequestedMethod,
): PaymentDestination {
  if (requestedMethod === 'STABLECOIN') {
    return {
      value:
        firstMatch(text, /\b(0x[a-fA-F0-9]{40})\b/) ||
        findLabelValue(text, ['wallet', 'wallet address']) ||
        'UNKNOWN',
      network:
        findLabelLineValue(lines, ['Network']) ||
        firstMatch(
          text,
          /\b(Ethereum(?: Sepolia)?|Polygon|Solana|Arbitrum|Optimism|Base|Tron)\b/i,
        ) ||
        'UNKNOWN',
      token_symbol:
        firstMatch(
          text,
          /\b(HKD|USDC|USDT|DAI|PYUSD|FDUSD|TUSD)\s+stablecoin\b/i,
        ) ||
        firstMatch(text, /\b(USDC|USDT|DAI|PYUSD|FDUSD|TUSD)\b/i) ||
        undefined,
    };
  }

  if (requestedMethod === 'FPS') {
    const fpsId =
      findLabelLineValue(lines, ['FPS Identifier', 'FPS ID']) ||
      firstMatch(
        text,
        /\bFPS\s*(?:ID|Identifier)?\s*[:#-]?\s*([0-9-]{3,24})\b/i,
      );
    const email =
      findLabelLineValue(lines, ['FPS Email Proxy', 'FPS Email']) ||
      firstMatch(text, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
    const phone = firstMatch(
      text,
      /\b(?:phone|mobile)\s*[:#-]?\s*(\+?[0-9][0-9 -]{6,20})\b/i,
    );

    return {
      fps_id: fpsId || undefined,
      proxy_type: email ? 'EMAIL' : phone ? 'PHONE' : undefined,
      proxy_value: email || phone || undefined,
    };
  }

  if (requestedMethod === 'CHATS_RTGS') {
    return {
      bank_name: findBankName(text, lines) || 'UNKNOWN',
      account_number: findAccountNumber(text, lines) || 'UNKNOWN',
      bank_code:
        firstMatch(text, /\bbank code\s*[:#-]?\s*([0-9]{2,8})\b/i) || undefined,
      branch_code:
        firstMatch(text, /\bbranch code\s*[:#-]?\s*([0-9]{2,8})\b/i) ||
        undefined,
    };
  }

  if (requestedMethod === 'CIPS') {
    return {
      bank_name: findBankName(text, lines) || 'UNKNOWN',
      account_number: findAccountNumber(text, lines) || 'UNKNOWN',
      cnaps_code:
        findLabelLineValue(lines, [
          'CNAPS / CIPS routing',
          'CNAPS',
          'CIPS routing',
        ]) ||
        firstMatch(
          text,
          /\b(?:cnaps|cips)\s*(?:code|id)?\s*[:#-]?\s*([A-Z0-9]{6,20})\b/i,
        ) ||
        undefined,
    };
  }

  if (requestedMethod === 'SWIFT') {
    return {
      iban:
        firstMatch(text, /\b([A-Z]{2}[0-9]{2}[A-Z0-9]{11,30})\b/i) || undefined,
      account_number: findAccountNumber(text, lines) || undefined,
      swift_bic:
        firstMatch(text, /\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/) ||
        'UNKNOWN',
      bank_name: findBankName(text, lines) || undefined,
    };
  }

  if (requestedMethod === 'BANK_TRANSFER') {
    return {
      bank_name: findBankName(text, lines) || 'UNKNOWN',
      account_number: findAccountNumber(text, lines) || 'UNKNOWN',
      bank_code:
        firstMatch(text, /\bbank code\s*[:#-]?\s*([0-9]{2,12})\b/i) ||
        undefined,
      branch_code:
        firstMatch(text, /\bbranch code\s*[:#-]?\s*([0-9]{2,12})\b/i) ||
        undefined,
    };
  }

  return {
    raw_text: text.slice(0, 2000),
  };
}

function findBankName(text: string, lines: string[]): string {
  return (
    findLabelLineValue(lines, ['Beneficiary bank', 'Bank name', 'Bank']) ||
    findLabelValue(text, ['beneficiary bank', 'bank name', 'bank'])
  );
}

function findAccountNumber(text: string, lines: string[]): string {
  return (
    findLabelLineValue(lines, [
      'Account No.',
      'Account No',
      'Account number',
    ]) ||
    firstMatch(
      text,
      /\b(?:account number|account no\.?|acct\.?)\s*[:#-]?\s*([A-Z0-9 -]{5,34})\b/i,
    ) ||
    ''
  ).replace(/\s/g, '');
}

function cleanValue(value: string): string {
  return value
    .replace(/^[:#\-\s]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[;,]+$/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
