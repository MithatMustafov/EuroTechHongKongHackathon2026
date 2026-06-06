import { Module } from '@nestjs/common';
import { ExtractionModule } from '../extraction/extraction.module';
import { RailDecisionModule } from '../rail-decision/rail-decision.module';
import { RiskScoreModule } from '../risk-score/risk-score.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [ExtractionModule, RiskScoreModule, RailDecisionModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}