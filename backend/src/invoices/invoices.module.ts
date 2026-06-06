import { Module } from '@nestjs/common';
import { ExtractionModule } from '../extraction/extraction.module';
import { RailDecisionModule } from '../rail-decision/rail-decision.module';
import { RiskScoreModule } from '../risk-score/risk-score.module';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [ExtractionModule, RiskScoreModule, RailDecisionModule],
  controllers: [InvoicesController],
})
export class InvoicesModule {}
