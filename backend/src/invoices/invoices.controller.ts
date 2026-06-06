import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import type { UploadedPdf } from './invoice-analysis.types';

@Controller('invoices')
export class InvoicesController {
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

    return this.invoicesService.analyzeInvoicePdf(pdf.buffer);
  }
}