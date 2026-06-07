import { Module } from '@nestjs/common';
import { RiskScoreService } from './risk-score.service';

@Module({
  providers: [RiskScoreService],
  exports: [RiskScoreService],
})
export class RiskScoreModule {}
