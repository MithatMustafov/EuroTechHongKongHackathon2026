import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { ExtractionModule } from './extraction/extraction.module';

@Module({
  imports: [InvoicesModule, ExtractionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
