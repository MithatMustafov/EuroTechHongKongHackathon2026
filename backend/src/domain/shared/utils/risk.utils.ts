import { THRESHOLDS } from '../constants/thresholds';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Single getRiskLevel implementation — previously duplicated in
 * risk-score/risk-score.service.ts and referenced inline in
 * invoices/invoices.service.ts and ai/ai.service.ts.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= THRESHOLDS.RISK_CRITICAL_THRESHOLD) return 'CRITICAL';
  if (score >= THRESHOLDS.RISK_HIGH_THRESHOLD)     return 'HIGH';
  if (score >= THRESHOLDS.RISK_MEDIUM_THRESHOLD)   return 'MEDIUM';
  return 'LOW';
}
