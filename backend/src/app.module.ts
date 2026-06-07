import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoiceModule } from './application/invoice/invoice.module';
import { InvoicesModule } from './application/invoices/invoices.module';

@Module({
  imports: [
    InvoiceModule,   // JSON analysis pipeline
    InvoicesModule,  // PDF upload pipeline
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
