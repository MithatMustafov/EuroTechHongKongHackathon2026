import { Module } from '@nestjs/common';
import { RailDecisionService } from './rail-decision.service';

@Module({
  providers: [RailDecisionService],
  exports: [RailDecisionService],
})
export class RailDecisionModule {}
