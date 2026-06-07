import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { KycCheck } from '../../domain/compliance/checks/kyc.check';
import { KybCheck } from '../../domain/compliance/checks/kyb.check';
import { SanctionsCheck } from '../../domain/compliance/checks/sanctions.check';
import { SanctionsDataService } from '../../infrastructure/sanctions/sanctions-data.service';
import { JurisdictionCheck } from '../../domain/compliance/checks/jurisdiction.check';
import { GoodsCategoryCheck } from '../../domain/compliance/checks/goods-category.check';
import { AmountPolicyCheck } from '../../domain/compliance/checks/amount-policy.check';
import { CnapsCheck } from '../../domain/compliance/checks/cnaps.check';
import { EmailCoherenceCheck } from '../../domain/compliance/checks/email-coherence.check';
import { FxModule } from '../../infrastructure/fx/fx.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

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
