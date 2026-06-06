import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ExtractionService } from './extraction.service';

describe('ExtractionService', () => {
  const service = new ExtractionService();
  const invoiceDir = resolveInvoiceDir();

  it.each([
    [
      '01_stablecoin_eligible.pdf',
      {
        invoice_number: 'NSC-2026-1048',
        due_date: '2026-06-10',
        supplier: {
          name: 'Nordic Sensor Components ApS',
          country: 'Denmark',
          email: 'finance@nordicsensor.dk',
        },
        payment: {
          amount: 42000,
          currency: 'HKD',
          requested_method: 'STABLECOIN',
          beneficiary_name: 'Nordic Sensor Components ApS',
          destination: {
            value: '0x6F3A9c23B4eC8d1a9f775b07B2d342E712af89C1',
            network: 'Licensed HKD stablecoin rail / test environment for demo',
            token_symbol: 'HKD',
          },
        },
      },
    ],
    [
      '02_fraud_hold.pdf',
      {
        invoice_number: 'BCG-2026-4472-R',
        due_date: '2026-06-06',
        supplier: {
          name: 'Berlin Components GmbH',
          country: 'Germany',
          email: 'accounts@berlin-components-payments.com',
        },
        payment: {
          amount: 42000,
          currency: 'HKD',
          requested_method: 'STABLECOIN',
          beneficiary_name: 'Global Trade Settlement Ltd.',
          destination: {
            value: '0xFaaE19bC44184291d3D71D02ef8A01734dEAD999',
            network: 'UNKNOWN',
          },
        },
        risk_signals: {
          urgency_language: true,
          pressure_language: true,
          secrecy_language: true,
          payment_details_changed: true,
        },
      },
    ],
    [
      '03_traditional_FPS.pdf',
      {
        invoice_number: 'KOS-2026-0618',
        due_date: '2026-06-20',
        supplier: {
          name: 'Kowloon Office Supplies Limited',
          country: 'Hong Kong',
          email: 'billing@kowloonoffice.hk',
        },
        payment: {
          amount: 7486,
          currency: 'HKD',
          requested_method: 'FPS',
          beneficiary_name: 'Kowloon Office Supplies Limited',
          destination: {
            fps_id: '162-882-993',
            proxy_type: 'EMAIL',
            proxy_value: 'payments@kowloonoffice.hk',
          },
        },
      },
    ],
    [
      '04_traditional_CIPS_RMB.pdf',
      {
        invoice_number: 'SPM-2026-2209',
        due_date: '2026-06-13',
        supplier: {
          name: 'Shenzhen Precision Moulding Co., Ltd.',
          country: 'China',
          email: 'ar@szprecision-moulding.cn',
        },
        payment: {
          amount: 176000,
          currency: 'CNY',
          requested_method: 'CIPS',
          beneficiary_name: 'Shenzhen Precision Moulding Co., Ltd.',
          destination: {
            bank_name: 'Bank of China, Shenzhen Guangming Sub-branch',
            account_number: '755923810042610088',
            cnaps_code: '104584000122',
          },
        },
      },
    ],
  ])('extracts the demo invoice %s', async (filename, expected) => {
    const pdf = readFileSync(join(invoiceDir, filename));

    await expect(service.extractInvoiceFromPdf(pdf)).resolves.toMatchObject(
      expected,
    );
  });

  it('extracts SWIFT and IBAN payment instructions from a European invoice', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'FROM',
        'Acme Robotics AG',
        'Bahnhofstrasse 1, Zurich, Switzerland',
        'billing@acme-robotics.ch',
        'BILL TO',
        'HarbourTech Electronics Limited',
        'Hong Kong',
        'Invoice # INV-9001',
        'Due Date June 6, 2026',
        'Grand Total EUR 12,345.67',
        'Payment Instructions',
        'Beneficiary: Acme Robotics AG',
        'Beneficiary Bank: UBS Switzerland AG',
        'IBAN: CH9300762011623852957',
        'SWIFT/BIC: UBSWCHZH80A',
        'Purpose: Servo motor order',
      ]),
    );

    expect(invoice).toMatchObject({
      invoice_number: 'INV-9001',
      due_date: '2026-06-06',
      supplier: {
        name: 'Acme Robotics AG',
        country: 'Switzerland',
        email: 'billing@acme-robotics.ch',
      },
      payment: {
        amount: 12345.67,
        currency: 'EUR',
        requested_method: 'SWIFT',
        beneficiary_name: 'Acme Robotics AG',
        destination: {
          iban: 'CH9300762011623852957',
          swift_bic: 'UBSWCHZH80A',
          bank_name: 'UBS Switzerland AG',
        },
      },
    });
  });

  it('extracts generic bank transfer details when no specific rail is present', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'Vendor',
        'Maple Tools Inc.',
        'Toronto, Canada',
        'Customer',
        'HarbourTech Electronics Limited',
        'Hong Kong',
        'Bill No BT-7788',
        'Payment Due 2026-07-01',
        'Amount Due USD 2,500.00',
        'Bank Details',
        'Bank Name: First National Bank',
        'Account Number: 123 456 789',
        'Routing Number: 021000021',
      ]),
    );

    expect(invoice).toMatchObject({
      invoice_number: 'BT-7788',
      payment: {
        amount: 2500,
        currency: 'USD',
        requested_method: 'BANK_TRANSFER',
        destination: {
          bank_name: 'First National Bank',
          account_number: '123456789',
          bank_code: '021000021',
        },
      },
      supplier: {
        country: 'Canada',
      },
    });
  });

  it('prefers Grand Total over earlier line-item amounts', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'Supplier',
        'Nordic Parts AB',
        'Stockholm, Sweden',
        'Client',
        'HarbourTech Electronics Limited',
        'Hong Kong',
        'Invoice ID NP-500',
        'Due 15 Jul 2026',
        'Widget line EUR 100.00',
        'Subtotal EUR 900.00',
        'Grand Total EUR 1,080.00',
      ]),
    );

    expect(invoice.payment.amount).toBe(1080);
    expect(invoice.payment.currency).toBe('EUR');
  });

  it('extracts Amount Due and SGD currency', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'From',
        'Lion City Packaging Pte Ltd',
        'Singapore',
        'Bill To',
        'HarbourTech Electronics Limited',
        'Hong Kong',
        'Document No SG-2026-8',
        'Pay By 2026-08-15',
        'Amount Due SGD 8,888.00',
      ]),
    );

    expect(invoice).toMatchObject({
      invoice_number: 'SG-2026-8',
      payment: {
        amount: 8888,
        currency: 'SGD',
        requested_method: 'UNKNOWN',
      },
      supplier: {
        country: 'Singapore',
      },
    });
  });

  it('normalizes RMB to CNY', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'From',
        'Shanghai Assembly Co Ltd',
        'Shanghai, China',
        'Bill To',
        'HarbourTech Electronics Limited',
        'Hong Kong',
        'Tax Invoice No CN-77',
        'Due Date 20 Aug 2026',
        'Total Due RMB 99,001.00',
        'Payment Instructions',
        'Bank: Industrial and Commercial Bank of China',
        'Account No.: 6222 0000 0000 0000',
        'CNAPS: 102290003007',
      ]),
    );

    expect(invoice.payment.currency).toBe('CNY');
    expect(invoice.payment.requested_method).toBe('CIPS');
  });

  it('fails safely when payment instructions are missing', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'From',
        'Plain Supplier Ltd',
        'London, United Kingdom',
        'Invoice No PS-404',
        'Due Date 2026-09-01',
        'Total Due GBP 100.00',
      ]),
    );

    expect(invoice.payment.requested_method).toBe('UNKNOWN');
    expect(invoice.payment.destination).toHaveProperty('raw_text');
    expect(invoice.payment.beneficiary_name).toBe('Plain Supplier Ltd');
  });

  it('fails safely for scanned or image-only PDFs', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      Buffer.from('%PDF-1.4\n1 0 obj << /Subtype /Image >> endobj\n%%EOF'),
    );

    expect(invoice).toMatchObject({
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
        requested_method: 'UNKNOWN',
        destination: {
          raw_text: '',
        },
      },
    });
  });

  it('chooses the final payable total when multiple amounts are present', async () => {
    const invoice = await service.extractInvoiceFromPdf(
      makePdf([
        'From',
        'Osaka Sensors KK',
        'Osaka, Japan',
        'Invoice No JP-100',
        'Due Date 2026-10-01',
        'Sensor pack JPY 50,000',
        'Shipping JPY 10,000',
        'Subtotal JPY 60,000',
        'Tax JPY 6,000',
        'Total Due JPY 66,000',
      ]),
    );

    expect(invoice.payment.amount).toBe(66000);
    expect(invoice.payment.currency).toBe('JPY');
  });
});

function makePdf(lines: string[]): Buffer {
  const stream = [
    'BT',
    ...lines.map((line) => `(${escapePdfString(line)}) Tj`),
    'ET',
  ].join('\n');

  return Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n%%EOF`,
  );
}

function escapePdfString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function resolveInvoiceDir(): string {
  const candidates = [
    resolve(process.cwd(), '../invoices'),
    resolve(process.cwd(), '../../demo_invoices'),
    resolve(process.cwd(), '../demo_invoices'),
  ];

  return (
    candidates.find((candidate) =>
      existsSync(join(candidate, '01_stablecoin_eligible.pdf')),
    ) || candidates[0]
  );
}
