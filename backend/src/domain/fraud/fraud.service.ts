import { Injectable, Logger } from '@nestjs/common';
import { AnalyzeInvoiceDto } from '../../application/invoice/dto/analyze-invoice.dto';
import { THRESHOLDS } from '../shared/constants/thresholds';
import type { RiskLevel } from '../shared/utils/risk.utils';

export interface FraudResult {
  score: number;
  level: RiskLevel;
  hold_required: boolean;
  triggered_rules: string[];
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  score(dto: AnalyzeInvoiceDto, amountHkd = 0): FraudResult {
    let score = 0;
    const rules: string[] = [];
    const signals = dto.risk_signals;

    if (signals?.urgency_language)        { score += THRESHOLDS.FRAUD_URGENCY_POINTS;          rules.push('urgency_language'); }
    if (signals?.pressure_language)       { score += THRESHOLDS.FRAUD_PRESSURE_POINTS;         rules.push('pressure_language'); }
    if (signals?.secrecy_language)        { score += THRESHOLDS.FRAUD_SECRECY_POINTS;          rules.push('secrecy_language'); }
    if (signals?.payment_details_changed) { score += THRESHOLDS.FRAUD_DETAILS_CHANGED_POINTS;  rules.push('payment_details_changed'); }

    if (amountHkd > THRESHOLDS.FPS_MAX_HKD) { score += THRESHOLDS.FRAUD_LARGE_AMOUNT_POINTS; rules.push('very_large_amount'); }

    if (dto.due_date) {
      const ms = Date.parse(dto.due_date);
      if (!Number.isNaN(ms)) {
        const daysUntilDue = (ms - Date.now()) / THRESHOLDS.MS_PER_DAY;
        if (daysUntilDue >= 0 && daysUntilDue < THRESHOLDS.FRAUD_IMMINENT_DUE_DAYS) {
          score += THRESHOLDS.FRAUD_IMMINENT_DUE_POINTS;
          rules.push('due_date_imminent');
        }
      }
    }

    score = Math.min(THRESHOLDS.FRAUD_MAX_SCORE, Math.max(0, score));

    const level: RiskLevel =
      score <= THRESHOLDS.FRAUD_MEDIUM_THRESHOLD ? 'LOW' :
      score <= THRESHOLDS.FRAUD_HIGH_THRESHOLD   ? 'MEDIUM' :
      score <= THRESHOLDS.FRAUD_CRITICAL_THRESHOLD ? 'HIGH' : 'CRITICAL';

    const hold_required = score >= THRESHOLDS.FRAUD_HOLD_THRESHOLD;
    this.logger.log(
      `  Fraud score=${score}  level=${level}  hold=${hold_required}` +
      (rules.length ? `  rules=[${rules.join(', ')}]` : ''),
    );

    return { score, level, hold_required, triggered_rules: rules };
  }
}
