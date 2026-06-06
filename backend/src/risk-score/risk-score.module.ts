import { Module } from '@nestjs/common';
import { RiskScoreController } from './risk-score.controller';
import { RiskScoreService } from './risk-score.service';

@Module({
  controllers: [RiskScoreController],
  providers: [RiskScoreService],
  exports: [RiskScoreService],
})
export class RiskScoreModule {}
