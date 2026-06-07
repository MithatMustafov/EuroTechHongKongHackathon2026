import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import type { UploadedPdf } from './invoice-analysis.types';

@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('pdf'))
  async analyzeInvoice(@UploadedFile() pdf?: UploadedPdf) {
    if (!pdf?.buffer) {
      throw new BadRequestException('PDF file is required in the "pdf" field.');
    }

    if (pdf.mimetype !== 'application/pdf') {
      throw new BadRequestException('Uploaded file must be a PDF.');
    }

    this.logger.log(`► POST /invoices/analyze  size=${pdf.buffer.length}b  name="${pdf.originalname ?? 'unknown'}"`);
    return this.invoicesService.analyzeInvoicePdf(pdf.buffer);
  }
}
