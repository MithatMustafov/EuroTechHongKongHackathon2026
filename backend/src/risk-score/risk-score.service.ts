import { Injectable } from '@nestjs/common';
import type { Invoice } from '../common/types/invoice.types';
import type { RiskScore } from './risk-score.types';

@Injectable()
export class RiskScoreService {
  calculateRiskScore(invoice: Invoice): RiskScore {
    void invoice;

    return {
      score: 0,
      level: 'LOW',
      decision: 'PASS',
      summary: '',
      reasons: [],
    };
  }
}
