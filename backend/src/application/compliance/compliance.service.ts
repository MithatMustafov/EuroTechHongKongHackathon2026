import { Injectable, Logger } from '@nestjs/common';

import { AnalyzeInvoiceDto } from '../invoice/dto/analyze-invoice.dto';
import { ComplianceReport, ComplianceCheckResult, CheckName } from '../../domain/compliance/compliance.types';
import { KycCheck } from '../../domain/compliance/checks/kyc.check';
import { KybCheck } from '../../domain/compliance/checks/kyb.check';
import { SanctionsCheck } from '../../domain/compliance/checks/sanctions.check';
import { JurisdictionCheck } from '../../domain/compliance/checks/jurisdiction.check';
import { GoodsCategoryCheck } from '../../domain/compliance/checks/goods-category.check';
import { AmountPolicyCheck } from '../../domain/compliance/checks/amount-policy.check';
import { CnapsCheck } from '../../domain/compliance/checks/cnaps.check';
import { EmailCoherenceCheck } from '../../domain/compliance/checks/email-coherence.check';

const HARD_FAIL_CHECKS: Set<CheckName> = new Set([
  'SANCTIONS_SCREEN',
  'JURISDICTION',
  'GOODS_CATEGORY',
  'CNAPS_VALIDATION',
]);

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

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

      const icon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '?';
      this.logger.log(`  ${icon} ${result.check.padEnd(20)} ${result.status.toUpperCase()}  ${result.detail ?? ''}`);

      if (result.status === 'failed' && HARD_FAIL_CHECKS.has(result.check)) {
        hardFail = true;
        overallStatus = 'failed';
        this.logger.warn(`  ⚡ Hard fail on ${result.check} — will block payment but continuing remaining checks`);
      } else

      if (result.status === 'failed') {
        overallStatus = 'failed';
      } else if (result.status === 'requires_review' && overallStatus === 'passed') {
        overallStatus = 'requires_review';
      }
    }

    return { overall_status: overallStatus, hard_fail: hardFail, checks };
  }
}
