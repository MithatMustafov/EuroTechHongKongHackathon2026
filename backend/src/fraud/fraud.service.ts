import { Injectable, Logger } from '@nestjs/common';
import { AnalyzeInvoiceDto } from '../invoice/dto/analyze-invoice.dto';

export interface FraudResult {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
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

    if (signals?.urgency_language)        { score += 20; rules.push('urgency_language'); }
    if (signals?.pressure_language)       { score += 20; rules.push('pressure_language'); }
    if (signals?.secrecy_language)        { score += 25; rules.push('secrecy_language'); }
    if (signals?.payment_details_changed) { score += 30; rules.push('payment_details_changed'); }

    if (amountHkd > 1_000_000) { score += 10; rules.push('very_large_amount'); }

    if (dto.due_date) {
      const daysUntilDue = (new Date(dto.due_date).getTime() - Date.now()) / 86_400_000;
      if (daysUntilDue >= 0 && daysUntilDue < 3) { score += 10; rules.push('due_date_imminent'); }
    }

    score = Math.min(100, Math.max(0, score));

    const level =
      score <= 30 ? 'low' :
      score <= 60 ? 'medium' :
      score <= 85 ? 'high' : 'critical';

    const hold_required = score >= 86;
    this.logger.log(
      `  Fraud score=${score}  level=${level.toUpperCase()}  hold=${hold_required}` +
      (rules.length ? `  rules=[${rules.join(', ')}]` : ''),
    );

    return { score, level, hold_required, triggered_rules: rules };
  }
}
