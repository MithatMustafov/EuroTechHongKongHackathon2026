import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { KycCheck } from './checks/kyc.check';
import { KybCheck } from './checks/kyb.check';
import { SanctionsCheck } from './checks/sanctions.check';
import { SanctionsDataService } from './sanctions-data.service';
import { JurisdictionCheck } from './checks/jurisdiction.check';
import { GoodsCategoryCheck } from './checks/goods-category.check';
import { AmountPolicyCheck } from './checks/amount-policy.check';
import { CnapsCheck } from './checks/cnaps.check';
import { EmailCoherenceCheck } from './checks/email-coherence.check';
import { FxModule } from '../fx/fx.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [FxModule, AiModule],
  providers: [
    ComplianceService,
    SanctionsDataService,
    KycCheck,
    KybCheck,
    SanctionsCheck,
    JurisdictionCheck,
    GoodsCategoryCheck,
    AmountPolicyCheck,
    CnapsCheck,
    EmailCoherenceCheck,
  ],
  exports: [ComplianceService],
})
export class ComplianceModule {}
