import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { FraudModule } from '../../domain/fraud/fraud.module';
import { RailModule } from '../../domain/rail/rail.module';
import { FxModule } from '../../infrastructure/fx/fx.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

@Module({
  imports: [ComplianceModule, FraudModule, RailModule, FxModule, AiModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
