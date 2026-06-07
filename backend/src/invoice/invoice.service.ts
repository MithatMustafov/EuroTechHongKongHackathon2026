import { Injectable } from '@nestjs/common';
import { AnalyzeInvoiceDto } from './dto/analyze-invoice.dto';
import { ExtractInvoiceDto } from './dto/extract-invoice.dto';
import { ComplianceService } from '../compliance/compliance.service';
import { FraudService } from '../fraud/fraud.service';
import { RailService } from '../rail/rail.service';
import { CostEstimatorService } from '../rail/cost-estimator.service';
import { FxService } from '../fx/fx.service';
import { AiService } from '../ai/ai.service';
import { RailName } from '../rail/rail.types';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly fraudService: FraudService,
    private readonly railService: RailService,
    private readonly costEstimatorService: CostEstimatorService,
    private readonly fxService: FxService,
    private readonly aiService: AiService,
  ) {}

  async analyze(dto: AnalyzeInvoiceDto) {
    const analyzedAt = new Date().toISOString();

    const compliance = await this.complianceService.runAll(dto);

    const currency = dto.payment.currency;
    const fxRate = currency === 'HKD' ? 1 : await this.fxService.getRate(currency, 'HKD');
    const amountHkd = Math.round(dto.payment.amount * fxRate);

    const fraud = this.fraudService.score(dto, amountHkd);

    const recommendation = this.railService.recommend(dto, compliance, fraud, amountHkd);

    const railsToEstimate = this.resolveRailsToEstimate(recommendation.recommended_rail);
    const costEstimates = await this.costEstimatorService.estimate(amountHkd, railsToEstimate);

    const checksTotal = compliance.checks.length;
    const checksPassed = compliance.checks.filter(c => c.status === 'passed').length;
    const checksFailed = compliance.checks.filter(c => c.status === 'failed').length;
    const validForSubmission =
      !compliance.hard_fail &&
      !fraud.hold_required &&
      compliance.overall_status !== 'failed';

    const datePart = analyzedAt.replace(/[-:.TZ]/g, '').slice(0, 14);
    const complianceReceipt = {
      receipt_id: `RG-${datePart}-${dto.invoice_number}`,
      invoice_number: dto.invoice_number,
      payer: dto.payer?.name,
      supplier: dto.supplier.name,
      amount: `${currency} ${dto.payment.amount.toLocaleString()}`,
      amount_hkd: amountHkd,
      fx_rate: `1 ${currency} = ${fxRate} HKD (interbank mid-market, open.er-api.com)`,
      recommended_rail: recommendation.recommended_rail,
      compliance_status: compliance.overall_status,
      fraud_score: fraud.score,
      fraud_level: fraud.level,
      checks_total: checksTotal,
      checks_passed: checksPassed,
      checks_failed: checksFailed,
      generated_at: analyzedAt,
      valid_for_submission: validForSubmission,
      disclaimer:
        'RailGuard is a decision support tool. This receipt does not constitute a payment instruction or legal compliance certification.',
    };

    return {
      invoice_number: dto.invoice_number,
      analyzed_at: analyzedAt,
      compliance,
      fraud,
      recommendation,
      cost_estimates: costEstimates,
      compliance_receipt: complianceReceipt,
    };
  }

  async extract(dto: ExtractInvoiceDto): Promise<Partial<AnalyzeInvoiceDto>> {
    return this.aiService.extractInvoiceFields(dto.file_base64, dto.media_type);
  }

  private resolveRailsToEstimate(recommended: string): RailName[] {
    const all: RailName[] = ['FPS', 'CHATS', 'CIPS', 'SWIFT', 'STABLECOIN'];
    if (recommended === 'BLOCKED' || recommended === 'HOLD') return all;
    return [recommended as RailName, ...all.filter(r => r !== recommended)];
  }
}
