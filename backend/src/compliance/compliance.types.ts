export type CheckStatus = 'passed' | 'requires_review' | 'failed';

export interface SanctionsScreen {
  query: string;
  hits: number;
}

export interface PepScreen {
  query: string;
  hits: number;
  datasets?: string[];
}

export interface ComplianceCheckResult {
  check: string;
  status: CheckStatus;
  detail: string;
  source: string;
  // Amount policy
  amount_hkd?: number;
  fx_rate_used?: number;
  large_transfer_flag?: boolean;
  // Sanctions
  screens?: SanctionsScreen[];
  // PEP screening
  pep_screens?: PepScreen[];
  // Goods category
  classification?: string;
  classified_by?: string;
  // Jurisdiction + Basel AML
  supplier_country?: string;
  aml_risk_score?: number;
  aml_risk_level?: 'low' | 'medium' | 'high' | 'critical';
  // CNAPS validation
  cnaps_code?: string;
  cnaps_bank_from_code?: string;
  cnaps_stated_bank?: string;
  cnaps_bank_match?: boolean;
  cips_participant?: boolean;
  // Email coherence
  email?: string;
  is_generic_domain?: boolean;
  domain_name_match?: boolean;
  email_quality_score?: number;
}

export interface ComplianceReport {
  overall_status: CheckStatus;
  hard_fail: boolean;
  checks: ComplianceCheckResult[];
}
