import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService } from '../extraction/extraction.service';

type UploadedPdf = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
};

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('pdf'))
  async extractInvoice(@UploadedFile() pdf?: UploadedPdf) {
    if (!pdf?.buffer) {
      throw new BadRequestException('PDF file is required in the "pdf" field.');
    }

    if (pdf.mimetype !== 'application/pdf') {
      throw new BadRequestException('Uploaded file must be a PDF.');
    }

    const invoice = await this.extractionService.extractInvoiceFromPdf(
      new Uint8Array(pdf.buffer),
    );

    console.log(invoice);

    return invoice;
  }
}
