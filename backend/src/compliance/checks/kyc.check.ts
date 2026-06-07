import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../invoice/dto/analyze-invoice.dto';

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
