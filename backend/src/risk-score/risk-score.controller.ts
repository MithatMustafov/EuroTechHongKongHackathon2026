import { Body, Controller, Post } from '@nestjs/common';
import { RiskScoreService } from './risk-score.service';
import {
  CheckFraudRequestDto,
  CheckFraudResponseDto,
} from './dto/check-fraud.dto';

/**
 * Fraud Check API.
 * Exposes POST /api/fraud/check (see brief §17 "Endpoints").
 */
@Controller('api/fraud')
export class RiskScoreController {
  constructor(private readonly riskScoreService: RiskScoreService) {}

  /** Runs the fraud pipeline over an extracted invoice. */
  @Post('check')
  checkFraud(@Body() body: CheckFraudRequestDto): CheckFraudResponseDto {
    throw new Error('Not implemented');
  }
}
