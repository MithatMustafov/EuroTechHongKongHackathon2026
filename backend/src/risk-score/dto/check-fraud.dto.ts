import { Invoice } from '../../common/types/invoice.types';
import { FraudCheckContext, FraudCheckResult } from '../types/risk-score.types';

/**
 * Request body for POST /api/fraud/check.
 * The extracted invoice (from the extraction component) plus optional
 * mocked context (supplier history, known wallets, etc.).
 */
export class CheckFraudRequestDto {
  invoice: Invoice;
  context?: FraudCheckContext;
}

/** Response body for POST /api/fraud/check. */
export type CheckFraudResponseDto = FraudCheckResult;
