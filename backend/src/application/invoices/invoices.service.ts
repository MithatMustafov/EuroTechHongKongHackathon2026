import { Injectable, Logger } from '@nestjs/common';
import { ExtractionService } from '../extraction/extraction.service';
import { RailDecisionService } from '../../domain/rail-decision/rail-decision.service';
import { RiskScoreService } from '../../domain/risk-score/risk-score.service';
import { formatRailLabel } from '../../domain/shared/constants/rails';
import { THRESHOLDS } from '../../domain/shared/constants/thresholds';
import type {
  FinalDecision,
  InvoiceAnalysisResponse,
} from './invoice-analysis.types';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly extractionService: ExtractionService,
    private readonly riskScoreService: RiskScoreService,
    private readonly railDecisionService: RailDecisionService,
  ) {}

  async analyzeInvoicePdf(pdfBuffer: Buffer): Promise<InvoiceAnalysisResponse> {
    const t0 = Date.now();
    this.logger.log('[1/3] Extracting invoice fields from PDF…');
    const invoice = await this.extractionService.extractInvoiceFromPdf(
      new Uint8Array(pdfBuffer),
    );
    this.logger.log(
      `[1/3] Extraction done  inv=${invoice.invoice_number ?? 'n/a'}  supplier="${invoice.supplier?.name ?? 'n/a'}"  amount=${invoice.payment?.amount} ${invoice.payment?.currency}`,
    );

    this.logger.log('[2/3] Scoring risk…');
    const riskScore = this.riskScoreService.calculateRiskScore(invoice);
    this.logger.log(`[2/3] Risk score=${riskScore.score}  level=${riskScore.level}`);

    this.logger.log('[3/3] Rail decision…');
    const railDecision = this.railDecisionService.decideRail(invoice);
    this.logger.log(`[3/3] Rail → ${railDecision.recommended_rail}`);

    const finalDecision = buildFinalDecision(riskScore, railDecision);
    this.logger.log(`✓ PDF analysis done  type=${finalDecision.type}  ms=${Date.now() - t0}`);

    return {
      invoice,
      risk_score: riskScore,
      rail_decision: railDecision,
      final_decision: finalDecision,
    };
  }
}

function buildFinalDecision(
  riskScore: InvoiceAnalysisResponse['risk_score'],
  railDecision: InvoiceAnalysisResponse['rail_decision'],
): FinalDecision {
  if (riskScore.score >= THRESHOLDS.DECISION_BLOCK_THRESHOLD) {
    return {
      type: 'BLOCK_PAYMENT',
      title: 'Payment blocked',
      message:
        'Critical fraud indicators were detected. Do not pay this invoice before manual verification.',
      primary_action_label: 'Send to review',
    };
  }

  if (riskScore.score >= THRESHOLDS.DECISION_HOLD_THRESHOLD) {
    return {
      type: 'HOLD_FOR_REVIEW',
      title: 'Manual review required',
      message:
        'High-risk payment indicators were detected. Verify the supplier and payment details before paying.',
      primary_action_label: 'Send to review',
    };
  }

  if (riskScore.score >= THRESHOLDS.DECISION_WARN_THRESHOLD) {
    return {
      type: 'WARN_BEFORE_PAYMENT',
      title: 'Proceed with caution',
      message: `Some risk indicators were detected. ${formatRailLabel(railDecision.recommended_rail, 'sentence')} can be prepared after confirmation.`,
      primary_action_label: 'Continue with warning',
    };
  }

  if (railDecision.recommended_rail === 'NONE') {
    return {
      type: 'HOLD_FOR_REVIEW',
      title: 'No payment rail available',
      message:
        'The invoice could not be matched to a safe supported payment rail. Review the payment details manually.',
      primary_action_label: 'Review payment details',
    };
  }

  return {
    type: 'CONFIRM_PAYMENT',
    title: 'Ready to pay',
    message: `This invoice is low risk. ${formatRailLabel(railDecision.recommended_rail, 'sentence')} is ready for confirmation.`,
    primary_action_label: `Confirm ${formatRailLabel(railDecision.recommended_rail, 'button')} payment`,
  };
}
