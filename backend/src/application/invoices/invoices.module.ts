import { Module } from '@nestjs/common';
import { ExtractionModule } from '../extraction/extraction.module';
import { RailDecisionModule } from '../../domain/rail-decision/rail-decision.module';
import { RiskScoreModule } from '../../domain/risk-score/risk-score.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [ExtractionModule, RiskScoreModule, RailDecisionModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
