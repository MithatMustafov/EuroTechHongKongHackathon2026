import { Injectable } from '@nestjs/common';
import type { Invoice } from '../common/types/invoice.types';
import type { RiskLevel, RiskReason, RiskScore } from './risk-score.types';

@Injectable()
export class RiskScoreService {
  calculateRiskScore(invoice: Invoice): RiskScore {
    const reasons: RiskReason[] = [];
    let score = 0;

    if (invoice.risk_signals.payment_details_changed) {
      score += 35;
      reasons.push({
        label: 'Payment details changed',
        severity: 'CRITICAL',
      });
    }

    if (invoice.risk_signals.urgency_language) {
      score += 20;
      reasons.push({
        label: 'Urgency language detected',
        severity: 'HIGH',
      });
    }

    if (invoice.risk_signals.pressure_language) {
      score += 15;
      reasons.push({
        label: 'Pressure language detected',
        severity: 'HIGH',
      });
    }

    if (invoice.risk_signals.secrecy_language) {
      score += 20;
      reasons.push({
        label: 'Secrecy language detected',
        severity: 'HIGH',
      });
    }

    if (
      !namesLikelyMatch(
        invoice.payment.beneficiary_name,
        invoice.supplier.name,
      )
    ) {
      score += 25;
      reasons.push({
        label: 'Beneficiary does not match supplier',
        severity: 'HIGH',
      });
    }

    if (
      invoice.payment.requested_method === 'STABLECOIN' &&
      'network' in invoice.payment.destination &&
      invoice.payment.destination.network.trim().toUpperCase() === 'UNKNOWN'
    ) {
      score += 10;
      reasons.push({
        label: 'Unknown stablecoin network',
        severity: 'MEDIUM',
      });
    }

    if (
      isUnknownValue(invoice.supplier.name) ||
      isUnknownValue(invoice.supplier.country)
    ) {
      score += 10;
      reasons.push({
        label: 'Supplier identity incomplete',
        severity: 'MEDIUM',
      });
    }

    score = Math.min(score, 100);
    const level = getRiskLevel(score);

    return {
      score,
      level,
      summary: buildRiskSummary(level, reasons),
      reasons: reasons.sort(compareReasonSeverity),
    };
  }
}

function namesLikelyMatch(beneficiaryName: string, supplierName: string): boolean {
  const beneficiary = normalizeName(beneficiaryName);
  const supplier = normalizeName(supplierName);

  return (
    beneficiary === supplier ||
    beneficiary.includes(supplier) ||
    supplier.includes(beneficiary)
  );
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bco\.,?\s*ltd\.?\b/g, '')
    .replace(/\bpte\.?\s*ltd\.?\b/g, '')
    .replace(/\bs\.?\s*l\.?\b/g, '')
    .replace(
      /\b(?:aps|gmbh|limited|ltd|ltd\.|inc|corp|company)\b/g,
      '',
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isUnknownValue(value: string): boolean {
  return value.trim().toUpperCase() === 'UNKNOWN';
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) {
    return 'CRITICAL';
  }

  if (score >= 60) {
    return 'HIGH';
  }

  if (score >= 30) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function buildRiskSummary(level: RiskLevel, reasons: RiskReason[]): string {
  if (reasons.length === 0) {
    return 'Low fraud risk. No risk signals were detected.';
  }

  const topReasons = reasons
    .slice()
    .sort(compareReasonSeverity)
    .slice(0, 2)
    .map((reason) => reasonLabelToSummaryClause(reason.label));
  const detail =
    topReasons.length === 1
      ? topReasons[0]
      : `${topReasons[0]} and ${topReasons[1]}`;

  return `${formatRiskLevel(level)} fraud risk. ${capitalize(detail)}.`;
}

function formatRiskLevel(level: RiskLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function reasonLabelToSummaryClause(label: string): string {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.endsWith(' detected')) {
    return `${lowerLabel.replace(/ detected$/, '')} was detected`;
  }

  return lowerLabel;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function compareReasonSeverity(left: RiskReason, right: RiskReason): number {
  return severityRank(right.severity) - severityRank(left.severity);
}

function severityRank(severity: RiskLevel): number {
  switch (severity) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
  }
}
