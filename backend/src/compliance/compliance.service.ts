import { Injectable } from '@nestjs/common';
import { AnalyzeInvoiceDto } from '../invoice/dto/analyze-invoice.dto';
import { ComplianceReport, ComplianceCheckResult } from './compliance.types';
import { KycCheck } from './checks/kyc.check';
import { KybCheck } from './checks/kyb.check';
import { SanctionsCheck } from './checks/sanctions.check';
import { JurisdictionCheck } from './checks/jurisdiction.check';
import { GoodsCategoryCheck } from './checks/goods-category.check';
import { AmountPolicyCheck } from './checks/amount-policy.check';
import { CnapsCheck } from './checks/cnaps.check';
import { EmailCoherenceCheck } from './checks/email-coherence.check';

// These checks cause an immediate pipeline halt when they fail
const HARD_FAIL_CHECKS = new Set(['SANCTIONS_SCREEN', 'JURISDICTION', 'GOODS_CATEGORY', 'CNAPS_VALIDATION']);

@Injectable()
export class ComplianceService {
  constructor(
    private readonly kycCheck: KycCheck,
    private readonly kybCheck: KybCheck,
    private readonly sanctionsCheck: SanctionsCheck,
    private readonly jurisdictionCheck: JurisdictionCheck,
    private readonly goodsCategoryCheck: GoodsCategoryCheck,
    private readonly amountPolicyCheck: AmountPolicyCheck,
    private readonly cnapsCheck: CnapsCheck,
    private readonly emailCoherenceCheck: EmailCoherenceCheck,
  ) {}

  async runAll(dto: AnalyzeInvoiceDto): Promise<ComplianceReport> {
    const checks: ComplianceCheckResult[] = [];
    let hardFail = false;
    let overallStatus: ComplianceReport['overall_status'] = 'passed';

    const runners = [
      () => this.kycCheck.run(dto),
      () => this.kybCheck.run(dto),
      () => this.sanctionsCheck.run(dto),
      () => this.jurisdictionCheck.run(dto),
      () => this.goodsCategoryCheck.run(dto),
      () => this.amountPolicyCheck.run(dto),
      () => this.cnapsCheck.run(dto),
      () => this.emailCoherenceCheck.run(dto),
    ];

    for (const runner of runners) {
      const result = await runner();
      checks.push(result);

      if (result.status === 'failed' && HARD_FAIL_CHECKS.has(result.check)) {
        hardFail = true;
        overallStatus = 'failed';
        break;
      }

      if (result.status === 'failed') {
        overallStatus = 'failed';
      } else if (result.status === 'requires_review' && overallStatus === 'passed') {
        overallStatus = 'requires_review';
      }
    }

    return { overall_status: overallStatus, hard_fail: hardFail, checks };
  }
}
