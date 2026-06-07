import { Module } from '@nestjs/common';
import { RailService } from './rail.service';
import { CostEstimatorService } from './cost-estimator.service';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [FxModule],
  providers: [RailService, CostEstimatorService],
  exports: [RailService, CostEstimatorService],
})
export class RailModule {}
