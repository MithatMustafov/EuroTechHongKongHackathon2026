import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { ExtractionModule } from './extraction/extraction.module';
import { RiskScoreModule } from './risk-score/risk-score.module';
import { RailDecisionModule } from './rail-decision/rail-decision.module';

@Module({
  imports: [
    InvoicesModule,
    ExtractionModule,
    RiskScoreModule,
    RailDecisionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
