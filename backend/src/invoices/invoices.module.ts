import { Module } from '@nestjs/common';
import { ExtractionModule } from '../extraction/extraction.module';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [ExtractionModule],
  controllers: [InvoicesController],
})
export class InvoicesModule {}
