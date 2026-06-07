import { Body, Controller, Post } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { AnalyzeInvoiceDto } from './dto/analyze-invoice.dto';
import { ExtractInvoiceDto } from './dto/extract-invoice.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeInvoiceDto) {
    return this.invoiceService.analyze(dto);
  }

  @Post('extract')
  extract(@Body() dto: ExtractInvoiceDto) {
    return this.invoiceService.extract(dto);
  }
}
