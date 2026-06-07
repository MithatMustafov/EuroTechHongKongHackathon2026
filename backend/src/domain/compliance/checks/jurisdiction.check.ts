import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../../application/invoice/dto/analyze-invoice.dto';
import { APPROVED_JURISDICTIONS, RESTRICTED_JURISDICTIONS } from '../../shared/utils/country.utils';
import { THRESHOLDS } from '../../shared/constants/thresholds';

// Basel AML Index 2024 — country money-laundering risk scores (0 = lowest risk, 10 = highest risk)
// Source: Basel Institute on Governance, https://index.baselgovernance.org/
// DATA: consider moving to data/basel-aml-2024.json for runtime updatability
const BASEL_AML_SCORES: Record<string, number> = {
  'Finland': 1.72,
  'Estonia': 1.86,
  'Iceland': 1.98,
  'Switzerland': 2.08,
  'Germany': 2.14,
  'Austria': 2.19,
  'Netherlands': 2.24,
  'Singapore': 2.35,
  'Norway': 2.37,
  'United Kingdom': 2.46,
  'Australia': 2.58,
  'Sweden': 2.67,
  'Denmark': 2.69,
  'Canada': 2.74,
  'Japan': 2.76,
  'France': 2.89,
  'New Zealand': 2.94,
  'Ireland': 3.01,
  'Belgium': 3.08,
  'Hong Kong': 3.12,
  'United States': 3.18,
  'South Korea': 3.25,
  'Portugal': 3.38,
  'Spain': 3.44,
  'Taiwan': 3.48,
  'Israel': 3.71,
  'Czech Republic': 3.84,
  'Poland': 3.91,
  'Italy': 4.15,
  'United Arab Emirates': 4.82,
  'China': 5.85,
  'South Africa': 5.12,
  'India': 5.47,
  'Thailand': 5.62,
  'Malaysia': 5.13,
  'Vietnam': 5.91,
  'Indonesia': 5.49,
  'Philippines': 6.21,
  'Cambodia': 7.15,
  'Russia': 8.21,
  'Iran': 8.73,
  'North Korea': 9.12,
  'Myanmar': 7.81,
  'Syria': 8.45,
  'Sudan': 7.93,
  'Yemen': 7.62,
  'Libya': 7.81,
  'Venezuela': 7.24,
  'Cuba': 6.89,
  'Afghanistan': 8.34,
  'Zimbabwe': 7.52,
  'Somalia': 8.91,
  'Belarus': 7.14,
};

type AmlRiskLevel = 'low' | 'medium' | 'high' | 'critical';

function amlLevel(score: number): AmlRiskLevel {
  if (score < THRESHOLDS.AML_MEDIUM_THRESHOLD)  return 'low';
  if (score < THRESHOLDS.AML_HIGH_THRESHOLD)    return 'medium';
  if (score < THRESHOLDS.AML_CRITICAL_THRESHOLD) return 'high';
  return 'critical';
}

@Injectable()
export class JurisdictionCheck {
  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const country = dto.supplier.country;
    const amlScore = BASEL_AML_SCORES[country];
    const riskLevel = amlScore !== undefined ? amlLevel(amlScore) : undefined;

    if (RESTRICTED_JURISDICTIONS.has(country)) {
      return {
        check: 'JURISDICTION',
        status: 'failed',
        detail: `${country} is a restricted jurisdiction — payment blocked`,
        source: 'internal_ruleset + Basel AML Index',
        supplier_country: country,
        aml_risk_score: amlScore,
        aml_risk_level: riskLevel,
      };
    }

    if (APPROVED_JURISDICTIONS.has(country)) {
      if (riskLevel === 'high' || riskLevel === 'critical') {
        return {
          check: 'JURISDICTION',
          status: 'requires_review',
          detail: `${country} — approved corridor but Basel AML risk score ${amlScore?.toFixed(2)} (${riskLevel}) — enhanced due diligence required`,
          source: 'internal_ruleset + Basel AML Index 2024',
          supplier_country: country,
          aml_risk_score: amlScore,
          aml_risk_level: riskLevel,
        };
      }

      return {
        check: 'JURISDICTION',
        status: 'passed',
        detail: `${country} — approved trade corridor${amlScore !== undefined ? `, Basel AML risk score ${amlScore.toFixed(2)} (${riskLevel})` : ''}`,
        source: 'internal_ruleset + Basel AML Index 2024',
        supplier_country: country,
        aml_risk_score: amlScore,
        aml_risk_level: riskLevel,
      };
    }

    return {
      check: 'JURISDICTION',
      status: 'requires_review',
      detail: `${country} — not on approved list${amlScore !== undefined ? `; Basel AML risk score ${amlScore.toFixed(2)} (${riskLevel})` : ''}; enhanced due diligence required`,
      source: 'internal_ruleset + Basel AML Index 2024',
      supplier_country: country,
      aml_risk_score: amlScore,
      aml_risk_level: riskLevel,
    };
  }
}
