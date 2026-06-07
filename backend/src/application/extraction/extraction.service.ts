import { Injectable, Logger } from '@nestjs/common';
import type { Invoice } from '../../domain/invoice/invoice.types';
import { extractInvoiceFromText } from '../../domain/extraction/invoice-field-extractor';
import { extractPdfText } from '../../infrastructure/extraction/pdf-text-extractor';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  async extractInvoiceFromPdf(pdf: Uint8Array): Promise<Invoice> {
    const extraction = await extractPdfText(pdf);

    for (const warning of extraction.warnings) {
      this.logger.warn(warning);
    }

    return extractInvoiceFromText(extraction);
  }
}
