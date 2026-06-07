import { Body, Controller, Logger, Post } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { AnalyzeInvoiceDto } from './dto/analyze-invoice.dto';
import { ExtractInvoiceDto } from './dto/extract-invoice.dto';

@Controller('invoice')
export class InvoiceController {
  private readonly logger = new Logger(InvoiceController.name);

  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeInvoiceDto) {
    this.logger.log(
      `► POST /invoice/analyze  inv=${dto.invoice_number}  supplier="${dto.supplier?.name}" (${dto.supplier?.country})  amount=${dto.payment?.amount} ${dto.payment?.currency}`,
    );
    return this.invoiceService.analyze(dto);
  }

  @Post('extract')
  extract(@Body() dto: ExtractInvoiceDto) {
    this.logger.log(`► POST /invoice/extract  mediaType=${dto.media_type ?? 'unknown'}`);
    return this.invoiceService.extract(dto);
  }
}
