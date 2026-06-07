import { Injectable } from '@nestjs/common';
import { ExtractionService } from '../extraction/extraction.service';
import { RailDecisionService } from '../rail-decision/rail-decision.service';
import { RiskScoreService } from '../risk-score/risk-score.service';
import type {
  FinalDecision,
  InvoiceAnalysisResponse,
} from './invoice-analysis.types';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly extractionService: ExtractionService,
    private readonly riskScoreService: RiskScoreService,
    private readonly railDecisionService: RailDecisionService,
  ) {}

  async analyzeInvoicePdf(pdfBuffer: Buffer): Promise<InvoiceAnalysisResponse> {
    const invoice = await this.extractionService.extractInvoiceFromPdf(
      new Uint8Array(pdfBuffer),
    );

    const riskScore = this.riskScoreService.calculateRiskScore(invoice);
    const railDecision = this.railDecisionService.decideRail(invoice);
    const finalDecision = buildFinalDecision(riskScore, railDecision);

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
  if (riskScore.score >= 95) {
    return {
      type: 'BLOCK_PAYMENT',
      title: 'Payment blocked',
      message:
        'Critical fraud indicators were detected. Do not pay this invoice before manual verification.',
      primary_action_label: 'Send to review',
    };
  }

  if (riskScore.score >= 60) {
    return {
      type: 'HOLD_FOR_REVIEW',
      title: 'Manual review required',
      message:
        'High-risk payment indicators were detected. Verify the supplier and payment details before paying.',
      primary_action_label: 'Send to review',
    };
  }

  if (riskScore.score >= 30) {
    return {
      type: 'WARN_BEFORE_PAYMENT',
      title: 'Proceed with caution',
      message: `Some risk indicators were detected. ${formatRailForSentence(
        railDecision.recommended_rail,
      )} can be prepared after confirmation.`,
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
    message: `This invoice is low risk. ${formatRailForSentence(
      railDecision.recommended_rail,
    )} is ready for confirmation.`,
    primary_action_label: `Confirm ${formatRailForButton(
      railDecision.recommended_rail,
    )} payment`,
  };
}

function formatRailForSentence(rail: string): string {
  switch (rail) {
    case 'FPS':
      return 'FPS';
    case 'CHATS_RTGS':
      return 'CHATS/RTGS';
    case 'CIPS':
      return 'CIPS';
    case 'SWIFT':
      return 'SWIFT';
    case 'STABLECOIN':
      return 'stablecoin payment';
    case 'BANK_TRANSFER':
      return 'bank transfer';
    case 'NONE':
      return 'no payment rail';
    default:
      return rail;
  }
}

function formatRailForButton(rail: string): string {
  switch (rail) {
    case 'CHATS_RTGS':
      return 'CHATS/RTGS';
    case 'STABLECOIN':
      return 'stablecoin';
    case 'BANK_TRANSFER':
      return 'bank transfer';
    case 'NONE':
      return 'payment';
    default:
      return rail;
  }
}