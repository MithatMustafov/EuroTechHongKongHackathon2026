export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskDecision = 'PASS' | 'WARN' | 'HOLD' | 'BLOCK';

export type RiskReason = {
  label: string;
  severity: RiskLevel;
};

export type RiskScore = {
  score: number;
  level: RiskLevel;
  decision: RiskDecision;
  summary: string;
  reasons: RiskReason[];
};