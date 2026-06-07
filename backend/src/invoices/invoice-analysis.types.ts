import type { Invoice } from '../common/types/invoice.types';
import type { RailDecision } from '../rail-decision/rail-decision.types';
import type { RiskScore } from '../risk-score/risk-score.types';

export type FinalDecisionType =
  | 'CONFIRM_PAYMENT'
  | 'WARN_BEFORE_PAYMENT'
  | 'HOLD_FOR_REVIEW'
  | 'BLOCK_PAYMENT';

export type FinalDecision = {
  type: FinalDecisionType;
  title: string;
  message: string;
  primary_action_label: string;
};

export type InvoiceAnalysisResponse = {
  invoice: Invoice;
  risk_score: RiskScore;
  rail_decision: RailDecision;
  final_decision: FinalDecision;
};

export type UploadedPdf = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
};