import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../invoice/dto/analyze-invoice.dto';
import { FxService } from '../../fx/fx.service';

const LARGE_TRANSFER_THRESHOLD_HKD = 500_000;

@Injectable()
export class AmountPolicyCheck {
  constructor(private readonly fxService: FxService) {}

  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const { amount, currency, requested_method } = dto.payment;

    const fxRateUsed = currency === 'HKD' ? 1 : await this.fxService.getRate(currency, 'HKD');
    const amountHkd = Math.round(amount * fxRateUsed);
    const largeTransferFlag = amountHkd > LARGE_TRANSFER_THRESHOLD_HKD;

    if (requested_method === 'FPS' && amountHkd > 1_000_000) {
      return {
        check: 'AMOUNT_POLICY',
        status: 'failed',
        detail: `HK$${amountHkd.toLocaleString()} exceeds FPS single-transaction limit of HK$1,000,000`,
        source: 'internal_ruleset',
        amount_hkd: amountHkd,
        fx_rate_used: fxRateUsed,
        large_transfer_flag: largeTransferFlag,
      };
    }

    if (requested_method === 'STABLECOIN' && amountHkd > 500_000) {
      return {
        check: 'AMOUNT_POLICY',
        status: 'failed',
        detail: `HK$${amountHkd.toLocaleString()} exceeds stablecoin policy cap of HK$500,000`,
        source: 'internal_ruleset',
        amount_hkd: amountHkd,
        fx_rate_used: fxRateUsed,
        large_transfer_flag: largeTransferFlag,
      };
    }

    return {
      check: 'AMOUNT_POLICY',
      status: largeTransferFlag ? 'requires_review' : 'passed',
      detail: largeTransferFlag
        ? `HK$${amountHkd.toLocaleString()} exceeds HK$500,000 — large-transfer review recommended`
        : `HK$${amountHkd.toLocaleString()} within standard policy limits`,
      source: 'internal_ruleset',
      amount_hkd: amountHkd,
      fx_rate_used: fxRateUsed,
      large_transfer_flag: largeTransferFlag,
    };
  }
}
