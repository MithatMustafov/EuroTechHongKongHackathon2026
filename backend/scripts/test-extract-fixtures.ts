import { deepStrictEqual } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inspect } from 'node:util';
import type { Invoice } from '../src/domain/invoice/invoice.types';
import { ExtractionService } from '../src/application/extraction/extraction.service';

const expected = JSON.parse(
  readFileSync(join(__dirname, 'expected-extractions.json'), 'utf8'),
) as Record<string, Invoice>;
const invoiceDir = resolveInvoiceDir();
const extractionService = new ExtractionService();
let failures = 0;

async function main() {
  for (const [filename, expectedInvoice] of Object.entries(expected)) {
    const pdf = readFileSync(join(invoiceDir, filename));
    const actualInvoice = await extractionService.extractInvoiceFromPdf(pdf);

    try {
      deepStrictEqual(actualInvoice, expectedInvoice);
      console.log(`PASS ${filename}`);
    } catch {
      failures += 1;
      console.error(`FAIL ${filename}`);
      console.error('Expected:');
      console.error(inspect(expectedInvoice, { depth: null, colors: true }));
      console.error('Actual:');
      console.error(inspect(actualInvoice, { depth: null, colors: true }));
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

void main();

function resolveInvoiceDir(): string {
  const candidates = [
    process.env.DEMO_INVOICE_DIR,
    resolve(process.cwd(), '../invoices'),
    resolve(process.cwd(), '../../demo_invoices'),
    resolve(process.cwd(), '../demo_invoices'),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const found = candidates.find((candidate) =>
    existsSync(join(candidate, '01_stablecoin_eligible.pdf')),
  );

  if (!found) {
    throw new Error(
      `Could not find demo invoice PDFs. Checked: ${candidates.join(', ')}`,
    );
  }

  return found;
}
