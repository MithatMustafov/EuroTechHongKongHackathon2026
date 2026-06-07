import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult, SanctionsScreen } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../invoice/dto/analyze-invoice.dto';
import { SanctionsDataService } from '../sanctions-data.service';

@Injectable()
export class SanctionsCheck {
  constructor(private readonly sanctionsData: SanctionsDataService) {}

  run(dto: AnalyzeInvoiceDto): ComplianceCheckResult {
    const entities = [
      dto.supplier.name,
      dto.payment.beneficiary_name ?? dto.supplier.name,
      dto.payment.destination?.bank_name,
    ].filter((q): q is string => Boolean(q));

    const uniqueEntities = [...new Set(entities)];

    const screens: SanctionsScreen[] = uniqueEntities.map(name => ({
      query: name,
      hits: this.sanctionsData.screen(name),
    }));

    const anyHit = screens.some(s => s.hits > 0);
    const status = anyHit ? 'failed' : 'passed';
    const detail = anyHit
      ? 'Sanctions match found — payment blocked pending compliance review'
      : 'No sanctions matches for supplier, beneficiary, or destination bank (EU + UN lists)';

    return {
      check: 'SANCTIONS_SCREEN',
      status,
      detail,
      source: 'local: EU Consolidated List + UN Consolidated List',
      screens,
      pep_screens: [],
    };
  }
}
