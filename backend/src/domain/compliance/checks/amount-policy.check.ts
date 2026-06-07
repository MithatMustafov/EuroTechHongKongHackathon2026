import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../../application/invoice/dto/analyze-invoice.dto';
import { FxService } from '../../../infrastructure/fx/fx.service';
import { THRESHOLDS } from '../../shared/constants/thresholds';

@Injectable()
export class AmountPolicyCheck {
  constructor(private readonly fxService: FxService) {}

  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const { amount, currency, requested_method } = dto.payment;

    const fxRateUsed = currency === 'HKD' ? 1 : await this.fxService.getRate(currency, 'HKD');
    const amountHkd = Math.round(amount * fxRateUsed);
    const largeTransferFlag = amountHkd > THRESHOLDS.LARGE_TRANSFER_HKD;

    if (requested_method === 'FPS' && amountHkd > THRESHOLDS.FPS_MAX_HKD) {
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

    if (requested_method === 'STABLECOIN' && amountHkd > THRESHOLDS.STABLECOIN_MAX_HKD) {
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
