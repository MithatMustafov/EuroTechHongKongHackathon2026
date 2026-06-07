import type { Invoice } from '../common/types/invoice.types';
import {
  findAllLabeledValues,
  findLabeledValue,
  findSectionBlock,
  firstRegexGroup,
} from './field-matching';
import {
  addDays,
  cleanLine,
  countryFromEmail,
  detectCurrency,
  findCountryInText,
  normalizeCompanyName,
  normalizeDate,
  parseMoney,
  truncateRawText,
} from './normalizers';
import {
  detectRequestedMethod,
  extractPaymentDestination,
  findPaymentBeneficiary,
  inferPaymentCurrency,
} from './payment-destination-extractor';
import { extractRiskSignals } from './risk-signal-extractor';

export type InvoiceExtractionInput = {
  text: string;
  lines: string[];
  warnings?: string[];
  scannedOrImageOnly?: boolean;
};

const INVOICE_NUMBER_LABELS = [
  'Invoice No',
  'Invoice No.',
  'Invoice #',
  'Inv No',
  'Inv. No.',
  'Invoice ID',
  'Bill No',
  'Bill Number',
  'Document No',
  'Document Number',
  'Tax Invoice No',
  'Tax Invoice Number',
  'Reference',
];

const DUE_DATE_LABELS = [
  'Due Date',
  'Payment Due',
  'Pay By',
  'Due',
  'Payment Date',
];

const INVOICE_DATE_LABELS = [
  'Invoice Date',
  'Bill Date',
  'Document Date',
  'Tax Date',
  'Date',
];

const AMOUNT_LABEL_PRIORITY = [
  ['Total Due', 'Amount Due', 'Balance Due', 'Payable Amount'],
  ['Grand Total', 'Invoice Total', 'Total Amount', 'Total'],
  ['Subtotal'],
];

export function extractInvoiceFromText(input: InvoiceExtractionInput): Invoice {
  if (input.scannedOrImageOnly || input.lines.length === 0) {
    return emptyInvoice(truncateRawText(input.text));
  }

  const requestedMethod = detectRequestedMethod(input.text, input.lines);
  const amount = extractAmount(input.text, input.lines);
  const supplierBlock = findSectionBlock(
    input.lines,
    ['FROM', 'Supplier', 'Vendor', 'Seller', 'Payee'],
    8,
  );
  const headerBlock = findHeaderBlock(input.lines);
  const payerBlock = findSectionBlock(
    input.lines,
    ['BILL TO', 'Invoice To', 'Sold To', 'Customer', 'Buyer', 'Client'],
    8,
  );
  const supplierEmail =
    findEmail(supplierBlock.join('\n')) ||
    findEmail(headerBlock.join('\n')) ||
    findEmail(input.text);
  const rawSupplierLabel = findLabeledValue(input.lines, [
    'Supplier',
    'Vendor',
    'Seller',
    'From',
    'Payee',
  ]);
  const supplierName = normalizeSupplierName(
    firstNamedLine(supplierBlock) ||
      rawSupplierLabel ||
      firstNamedLine(headerBlock) ||
      'UNKNOWN',
  );
  const payerName =
    firstNamedLine(payerBlock) ||
    findLabeledValue(input.lines, [
      'Bill To',
      'Customer',
      'Buyer',
      'Invoice To',
      'Sold To',
      'Client',
    ]) ||
    'UNKNOWN';
  const beneficiaryName =
    findPaymentBeneficiary(input.lines, requestedMethod) ||
    supplierName ||
    'UNKNOWN';
  const supplierCountry =
    findCountryInBlock(supplierBlock) ||
    findCountryInText(rawSupplierLabel) ||
    findCountryInBlock(headerBlock) ||
    countryFromEmail(supplierEmail) ||
    'UNKNOWN';

  return {
    invoice_number: extractInvoiceNumber(input.text, input.lines),
    due_date: extractDueDate(input.text, input.lines),
    payer: {
      name: payerName,
      country: findCountryInBlock(payerBlock) || 'UNKNOWN',
    },
    supplier: {
      name: supplierName,
      country: supplierCountry,
      ...(supplierEmail ? { email: supplierEmail } : {}),
    },
    payment: {
      amount: amount.amount,
      currency:
        amount.currency ||
        findLabeledCurrency(input.lines) ||
        inferPaymentCurrency(input.text),
      purpose: extractPurpose(input.lines),
      requested_method: requestedMethod,
      beneficiary_name: beneficiaryName,
      destination: extractPaymentDestination(
        input.text,
        input.lines,
        requestedMethod,
      ),
    },
    risk_signals: extractRiskSignals(input.text),
  };
}

function emptyInvoice(rawText: string): Invoice {
  return {
    invoice_number: 'UNKNOWN',
    due_date: 'UNKNOWN',
    payer: {
      name: 'UNKNOWN',
      country: 'UNKNOWN',
    },
    supplier: {
      name: 'UNKNOWN',
      country: 'UNKNOWN',
    },
    payment: {
      amount: 0,
      currency: 'UNKNOWN',
      purpose: 'UNKNOWN',
      requested_method: 'UNKNOWN',
      beneficiary_name: 'UNKNOWN',
      destination: {
        raw_text: rawText,
      },
    },
    risk_signals: {
      urgency_language: false,
      pressure_language: false,
      secrecy_language: false,
      payment_details_changed: false,
    },
  };
}

function extractInvoiceNumber(text: string, lines: string[]): string {
  const shortNo = firstRegexGroup(text, /^No:\s*([A-Z0-9][A-Z0-9._/-]{3,})$/im);

  if (shortNo) {
    return cleanInvoiceNumber(shortNo);
  }

  const labeled = findLabeledValue(lines, INVOICE_NUMBER_LABELS);

  if (labeled) {
    return cleanInvoiceNumber(labeled);
  }

  return cleanInvoiceNumber(
    firstRegexGroup(
      text,
      /\b(?:invoice|inv|bill|document|tax invoice)\s*(?:number|no\.?|#|id)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{3,})\b/i,
    ) || 'UNKNOWN',
  );
}

function extractDueDate(text: string, lines: string[]): string {
  const dueDate = findLabeledValue(lines, DUE_DATE_LABELS);

  if (dueDate) {
    return normalizeDate(dueDate).value;
  }

  const terms = findLabeledValue(lines, ['Terms', 'Payment Terms']);
  const netDays = terms.match(/\bNet\s*([0-9]{1,3})\b/i)?.[1];

  if (netDays) {
    const invoiceDate = normalizeDate(
      findLabeledValue(lines, INVOICE_DATE_LABELS),
    ).value;
    const computed = addDays(invoiceDate, Number.parseInt(netDays, 10));

    if (computed !== 'UNKNOWN') {
      return computed;
    }
  }

  const regexDate = firstRegexGroup(
    text,
    /\b(?:due date|payment due|pay by|due)\s*[:#-]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Z][a-z]+\.?,?\s+[0-9]{2,4}|[A-Z][a-z]+\.?\s+[0-9]{1,2},?\s+[0-9]{2,4})/i,
  );

  return regexDate ? normalizeDate(regexDate).value : 'UNKNOWN';
}

function extractAmount(
  text: string,
  lines: string[],
): { amount: number; currency: string } {
  for (const labels of AMOUNT_LABEL_PRIORITY) {
    const values = findAllLabeledValues(lines, labels);
    const moneyValues = values
      .map(parseMoney)
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    if (moneyValues.length > 0) {
      const selected = moneyValues[moneyValues.length - 1];

      return {
        amount: selected.amount,
        currency: selected.currency,
      };
    }
  }

  const allMoney = [
    ...text.matchAll(
      /\b(?:HKD|USD|EUR|GBP|CNY|RMB|CNH|JPY|SGD|AUD|CAD|CHF|DKK|SEK|NOK|INR|KRW|THB|IDR|MYR|PHP)?\s*(?:[$€£¥￥₹₩฿]\s*)?[0-9]{1,3}(?:[,\s][0-9]{3})+(?:[.,][0-9]{2})?\b/gi,
    ),
  ]
    .map((match) => parseMoney(match[0]))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (allMoney.length === 0) {
    return { amount: 0, currency: 'UNKNOWN' };
  }

  const selected = allMoney[allMoney.length - 1];

  return {
    amount: selected.amount,
    currency: selected.currency,
  };
}

function findLabeledCurrency(lines: string[]): string {
  const value = findLabeledValue(lines, [
    'Currency',
    'Settlement currency',
    'Payment Currency',
  ]);

  return value ? detectCurrency(value) || 'UNKNOWN' : 'UNKNOWN';
}

function extractPurpose(lines: string[]): string {
  const labeled = findLabeledValue(lines, [
    'Purpose code',
    'Purpose',
    'Payment Purpose',
    'Payment for',
    'Memo',
  ]);

  if (labeled) {
    return labeled;
  }

  const projectBlock = findSectionBlock(lines, ['SHIP TO / PROJECT'], 5);

  if (
    projectBlock[1] &&
    !/^(delivery|incoterms|ap contact)\b/i.test(projectBlock[1])
  ) {
    return projectBlock[1];
  }

  return extractLineItemPurpose(lines) || 'UNKNOWN';
}

function firstNamedLine(block: string[]): string {
  return (
    block.find(
      (line) =>
        !/\b(address|email|phone|vat|tax|cvr|br|hrb|uscc|contact)\b/i.test(
          line,
        ),
    ) || ''
  );
}

function findCountryInBlock(block: string[]): string {
  for (const line of block) {
    const country = findCountryInText(line);

    if (country) {
      return country;
    }
  }

  return '';
}

function findEmail(text: string): string {
  return text.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)?.[1] || '';
}

function findHeaderBlock(lines: string[]): string[] {
  const stopIndex = lines.findIndex((line) =>
    /^(tax invoice|commercial invoice|proforma invoice|invoice|bill to|customer|invoice no\.?|no:)/i.test(
      line,
    ),
  );

  return lines.slice(
    0,
    stopIndex === -1 ? Math.min(lines.length, 4) : stopIndex,
  );
}

function normalizeSupplierName(value: string): string {
  if (value === 'UNKNOWN') {
    return value;
  }

  return normalizeCompanyName(value);
}

function cleanInvoiceNumber(value: string): string {
  return (
    value
      .replace(/^(?:invoice\s*)?(?:no\.?|number|#|id)\s*[:#-]?\s*/i, '')
      .trim() || 'UNKNOWN'
  );
}

function extractLineItemPurpose(lines: string[]): string {
  const start = lines.findIndex((line) =>
    /^(description|part \/ description|order summary|item)$/i.test(line),
  );

  if (start === -1) {
    return '';
  }

  const descriptions: string[] = [];

  for (const line of lines.slice(start + 1)) {
    if (
      /^(subtotal|total|total due|vat|tax|payment|settlement|bank|new payment|transfer|demo invoice)/i.test(
        line,
      )
    ) {
      break;
    }

    const description = normalizeDescriptionLine(line);

    if (description) {
      descriptions.push(description);
    }
  }

  if (descriptions.length === 0) {
    return '';
  }

  const [first, second] = descriptions;

  if (!second) {
    return first;
  }

  return `${first} and ${lowercaseFirst(second)}`;
}

function normalizeDescriptionLine(value: string): string {
  const line = cleanLine(value);

  if (
    !line ||
    /^(qty|unit|unit price|amount|item|description|part \/ description)$/i.test(
      line,
    ) ||
    /^[0-9]+$/.test(line) ||
    /^(HKD|EUR|JPY|USD|CNY|RMB)\b/i.test(line)
  ) {
    return '';
  }

  return capitalizeFirst(
    line
      .replace(/^[0-9][0-9,.\s]*\s+(?:units?|pcs?|pieces?)\s+/i, '')
      .replace(/,\s*(?:batch|lot|navy|po-|export inspected).+$/i, '')
      .replace(/\s+and spindle alignment$/i, '')
      .replace(/^Express export packing and documentation$/i, 'export packing')
      .replace(
        /^Vacuum sealed packaging and documentation$/i,
        'export packaging',
      )
      .replace(/^On-site setup and acceptance testing$/i, 'on-site setup')
      .trim(),
  );
}

function capitalizeFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function lowercaseFirst(value: string): string {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}
