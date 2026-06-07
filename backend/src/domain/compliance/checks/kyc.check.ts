import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../../application/invoice/dto/analyze-invoice.dto';

// STUB: replace with real KYC provider (e.g. Jumio, Onfido, Shufti Pro)
@Injectable()
export class KycCheck {
  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    return {
      check: 'KYC_PAYER',
      status: 'passed',
      detail: `${dto.payer?.name ?? 'Payer'} — verified at onboarding`,
      source: 'mock_internal',
    };
  }
}
