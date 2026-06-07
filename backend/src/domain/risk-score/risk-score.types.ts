export type { RiskLevel } from '../shared/utils/risk.utils';

import type { RiskLevel } from '../shared/utils/risk.utils';

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
