import { cleanLine, escapeRegExp, normalizeLabel } from './normalizers';

export const SECTION_HEADINGS = [
  'FROM',
  'SUPPLIER',
  'VENDOR',
  'SELLER',
  'PAYEE',
  'BILL TO',
  'INVOICE TO',
  'SOLD TO',
  'CUSTOMER',
  'BUYER',
  'CLIENT',
  'SHIP TO',
  'SHIP TO / PROJECT',
  'PAYMENT INSTRUCTIONS',
  'BANK DETAILS',
  'REMITTANCE DETAILS',
  'WIRE INSTRUCTIONS',
  'INTERNATIONAL WIRE TRANSFER INSTRUCTIONS',
  'PAYMENT DETAILS',
  'BANK TRANSFER DETAILS - CHATS / RTGS',
  'NOTES / TERMS',
  'TERMS',
  'DESCRIPTION',
];

export function findLabeledValue(lines: string[], labels: string[]): string {
  for (const label of labels) {
    const directPattern = new RegExp(
      `^\\s*${escapeRegExp(label)}\\s*(?:[:#.-]|\\s-)?\\s*(.+)$`,
      'i',
    );

    for (let index = 0; index < lines.length; index += 1) {
      const line = cleanLine(lines[index]);
      const direct = line.match(directPattern)?.[1];

      if (isMeaningfulValue(direct) && !isLikelyHeading(direct)) {
        return cleanLine(direct);
      }

      if (normalizeLabel(line) === normalizeLabel(label)) {
        return findNextValueLine(lines, index + 1);
      }
    }
  }

  return '';
}

export function findAllLabeledValues(
  lines: string[],
  labels: string[],
): string[] {
  const values: string[] = [];

  for (const label of labels) {
    const directPattern = new RegExp(
      `^\\s*${escapeRegExp(label)}\\s*(?:[:#.-]|\\s-)?\\s*(.+)$`,
      'i',
    );

    for (let index = 0; index < lines.length; index += 1) {
      const line = cleanLine(lines[index]);
      const direct = line.match(directPattern)?.[1];

      if (isMeaningfulValue(direct) && !isLikelyHeading(direct)) {
        values.push(cleanLine(direct));
      } else if (normalizeLabel(line) === normalizeLabel(label)) {
        const next = findNextValueLine(lines, index + 1);

        if (next) {
          values.push(next);
        }
      }
    }
  }

  return values;
}

export function findSectionBlock(
  lines: string[],
  labels: string[],
  maxLines = 10,
): string[] {
  const start = findSectionIndex(lines, labels);

  if (start === -1) {
    return [];
  }

  const block: string[] = [];

  for (
    let index = start + 1;
    index < lines.length && block.length < maxLines;
    index += 1
  ) {
    const line = cleanLine(lines[index]);

    if (!line) {
      continue;
    }

    if (block.length > 0 && isLikelyHeading(line)) {
      break;
    }

    block.push(line);
  }

  return block;
}

export function findSectionIndex(lines: string[], labels: string[]): number {
  const normalizedLabels = labels.map(normalizeLabel);

  return lines.findIndex((line) =>
    normalizedLabels.includes(normalizeLabel(cleanLine(line))),
  );
}

export function firstRegexGroup(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1]?.trim() || '';
}

export function isLikelyHeading(value: string): boolean {
  const normalized = normalizeLabel(value);

  if (!normalized) {
    return false;
  }

  return SECTION_HEADINGS.some(
    (heading) => normalizeLabel(heading) === normalized,
  );
}

function findNextValueLine(lines: string[], startIndex: number): string {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);

    if (!line) {
      continue;
    }

    if (isLikelyHeading(line)) {
      return '';
    }

    return line;
  }

  return '';
}

function isMeaningfulValue(value: string | undefined): value is string {
  return Boolean(value && /[A-Za-z0-9]/.test(value));
}
