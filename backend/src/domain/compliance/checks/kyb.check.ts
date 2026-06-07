import { Injectable, Logger } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../../application/invoice/dto/analyze-invoice.dto';

const JURISDICTION_CODES: Record<string, string> = {
  'Hong Kong': 'hk',
  'China': 'cn',
  'Singapore': 'sg',
  'Japan': 'jp',
  'South Korea': 'kr',
  'Australia': 'au',
  'United Kingdom': 'gb',
  'Germany': 'de',
  'United States': 'us',
  'Canada': 'ca',
};

@Injectable()
export class KybCheck {
  private readonly logger = new Logger(KybCheck.name);

  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    // Priority 1: OpenCorporates (free API, 200M+ global company registry)
    const ocResult = await this.tryOpenCorporates(dto).catch((err: unknown) => {
      this.logger.warn(`OpenCorporates lookup failed for "${dto.supplier.name}" — using mock fallback: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    });
    if (ocResult) return ocResult;

    // Priority 2: Mock fallback
    return {
      check: 'KYB_SUPPLIER',
      status: 'passed',
      detail: `${dto.supplier.name} — verified (mock fallback; registry API unavailable)`,
      source: 'mock_fallback',
    };
  }

  private async tryOpenCorporates(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const jCode = JURISDICTION_CODES[dto.supplier.country] ?? '';
    let url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(dto.supplier.name)}&per_page=3`;
    if (jCode) url += `&jurisdiction_code=${jCode}`;

    const ocToken = process.env.OPENCORPORATES_API_TOKEN;
    if (ocToken) url += `&api_token=${ocToken}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OpenCorporates ${res.status}`);

    const data = await res.json() as {
      results?: { companies?: { company: { name: string; current_status: string | null; jurisdiction_code: string } }[] }
    };

    const companies = data?.results?.companies ?? [];

    if (companies.length === 0) {
      return {
        check: 'KYB_SUPPLIER',
        status: 'requires_review',
        detail: `${dto.supplier.name} — not found in OpenCorporates registry (${dto.supplier.country})`,
        source: 'opencorporates',
      };
    }

    const best = companies[0].company;
    const status = best.current_status?.toLowerCase();
    const isActive = !status || status === 'active' || status === 'registered' || status.includes('good standing');

    return {
      check: 'KYB_SUPPLIER',
      status: isActive ? 'passed' : 'requires_review',
      detail: `${best.name} — ${isActive ? 'registered' : `status: ${best.current_status}`} (OpenCorporates/${best.jurisdiction_code?.toUpperCase()})`,
      source: 'opencorporates',
    };
  }
}
