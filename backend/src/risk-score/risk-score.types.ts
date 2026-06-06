export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskReason = {
  label: string;
  severity: RiskLevel;
};

export type RiskScore = {
  score: number;
  level: RiskLevel;
  summary: string;
  reasons: RiskReason[];
};
