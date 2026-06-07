import { Injectable } from '@nestjs/common';
import { AnalyzeInvoiceDto } from '../../application/invoice/dto/analyze-invoice.dto';
import { ComplianceReport } from '../compliance/compliance.types';
import { FraudResult } from '../fraud/fraud.service';
import { RailName, RailRecommendation, RailAlternative } from './rail.types';
import { THRESHOLDS } from '../shared/constants/thresholds';

@Injectable()
export class RailService {
  recommend(
    dto: AnalyzeInvoiceDto,
    compliance: ComplianceReport,
    fraud: FraudResult,
    amountHkd: number,
  ): RailRecommendation {
    const { currency, requested_method } = dto.payment;
    const supplierCountry = dto.supplier.country;
    const stablecoinVerified = dto.payment.stablecoin_wallet_verified ?? false;
    const compliancePassed = compliance.overall_status === 'passed';

    if (fraud.hold_required) {
      return this.hardBlock('HOLD', 'Fraud score ≥ 86 — payment held for manual review');
    }
    if (compliance.hard_fail) {
      const failedCheck = compliance.checks.find(c => c.status === 'failed');
      const reason = failedCheck
        ? `${failedCheck.check}: ${failedCheck.detail}`
        : 'Compliance hard fail — payment blocked';
      return this.hardBlock('BLOCKED', reason);
    }

    let rail: RailName;
    let reason: string;

    if (supplierCountry === 'Hong Kong' && currency === 'HKD' && dto.payment.amount < THRESHOLDS.CHATS_MIN_HKD) {
      rail = 'FPS';
      reason = 'Local HKD payment under HK$100,000 — FPS is fastest and cheapest';
    } else if (supplierCountry === 'Hong Kong' && amountHkd >= THRESHOLDS.CHATS_MIN_HKD) {
      rail = 'CHATS_RTGS';
      reason = 'Large local HKD payment — CHATS same-day settlement';
    } else if (supplierCountry === 'China' && currency === 'CNY') {
      rail = 'CIPS';
      reason = 'Mainland China supplier with CNY invoice — CIPS is direct, lowest cost, no intermediary hops';
    } else if (
      stablecoinVerified &&
      currency === 'HKD' &&
      fraud.score <= THRESHOLDS.FRAUD_MEDIUM_THRESHOLD &&
      amountHkd <= THRESHOLDS.STABLECOIN_MAX_HKD &&
      compliancePassed
    ) {
      rail = 'STABLECOIN';
      reason = 'HKD stablecoin wallet verified, low fraud score, compliance passed — near-zero fee option';
    } else {
      rail = 'SWIFT';
      reason = 'No matching local or direct corridor — SWIFT universal cross-border fallback';
    }

    const requestedMethodMatch = !requested_method || requested_method === rail;

    return {
      recommended_rail: rail,
      reason,
      requested_method_match: requestedMethodMatch,
      alternatives: this.getAlternatives(rail, dto, compliance, fraud, amountHkd),
    };
  }

  private hardBlock(type: 'HOLD' | 'BLOCKED', reason: string): RailRecommendation {
    return { recommended_rail: type, reason, requested_method_match: false, alternatives: [] };
  }

  private getAlternatives(
    recommended: RailName,
    dto: AnalyzeInvoiceDto,
    compliance: ComplianceReport,
    fraud: FraudResult,
    amountHkd: number,
  ): RailAlternative[] {
    const all: RailName[] = ['FPS', 'CHATS_RTGS', 'CIPS', 'SWIFT', 'STABLECOIN'];
    return all
      .filter(r => r !== recommended)
      .map(r => this.evaluateAlternative(r, dto, compliance, fraud, amountHkd));
  }

  private evaluateAlternative(
    rail: RailName,
    dto: AnalyzeInvoiceDto,
    compliance: ComplianceReport,
    fraud: FraudResult,
    amountHkd: number,
  ): RailAlternative {
    const { currency } = dto.payment;
    const supplierCountry = dto.supplier.country;
    const stablecoinVerified = dto.payment.stablecoin_wallet_verified ?? false;
    const compliancePassed = compliance.overall_status === 'passed';

    switch (rail) {
      case 'FPS':
        if (supplierCountry !== 'Hong Kong') return { rail, eligible: false, reason: 'FPS is domestic HKD only — supplier must be in Hong Kong' };
        if (currency !== 'HKD') return { rail, eligible: false, reason: 'FPS requires HKD settlement' };
        if (amountHkd > THRESHOLDS.FPS_MAX_HKD) return { rail, eligible: false, reason: 'Amount exceeds FPS limit of HK$1,000,000' };
        return { rail, eligible: true };

      case 'CHATS_RTGS':
        if (supplierCountry !== 'Hong Kong') return { rail, eligible: false, reason: 'CHATS is for domestic HK payments only' };
        return { rail, eligible: true };

      case 'CIPS':
        if (supplierCountry !== 'China') return { rail, eligible: false, reason: 'CIPS is for Mainland China suppliers only' };
        if (currency !== 'CNY') return { rail, eligible: false, reason: 'CIPS requires CNY denomination' };
        return { rail, eligible: true };

      case 'STABLECOIN':
        if (!stablecoinVerified) return { rail, eligible: false, reason: 'No verified stablecoin wallet on file for supplier' };
        if (currency !== 'HKD') return { rail, eligible: false, reason: 'HKD stablecoin rail requires HKD invoice' };
        if (fraud.score > THRESHOLDS.FRAUD_MEDIUM_THRESHOLD) return { rail, eligible: false, reason: `Fraud score ${fraud.score} too high for stablecoin (max ${THRESHOLDS.FRAUD_MEDIUM_THRESHOLD})` };
        if (amountHkd > THRESHOLDS.STABLECOIN_MAX_HKD) return { rail, eligible: false, reason: 'Amount exceeds stablecoin policy limit of HK$500,000' };
        if (!compliancePassed) return { rail, eligible: false, reason: 'All compliance checks must pass for stablecoin' };
        return { rail, eligible: true };

      case 'SWIFT':
        return { rail, eligible: true, reason: 'Universal international fallback' };
    }
  }
}
