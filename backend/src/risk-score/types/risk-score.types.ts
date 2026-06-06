import { Invoice } from '../../common/types/invoice.types';

/**
 * Fraud risk levels, mapped from the numeric fraud score.
 * See brief §15 "Risk level mapping".
 *   0–30   -> low
 *   31–60  -> medium
 *   61–85  -> high
 *   86–100 -> critical
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Recommended action derived from the fraud risk level.
 * Drives the downstream rail-decision component.
 */
export type RecommendedAction = 'APPROVE' | 'REVIEW' | 'HOLD' | 'BLOCK';

/**
 * Optional context the fraud engine can use beyond the invoice itself
 * (e.g. supplier history, known wallets/accounts). All mocked for the MVP.
 */
export type FraudCheckContext = {
  known_supplier?: boolean;
  expected_email_domain?: string;
  previous_destinations?: string[];
  historical_amounts?: number[];
  new_payment_rail?: boolean;
  seconds_since_invoice_upload?: number;
};

/** §9.1 Invoice completeness check */
export type InvoiceCompletenessResult = {
  passed: boolean;
  missing_fields: string[];
};

/** §9.2 Amount consistency check */
export type AmountConsistencyResult = {
  passed: boolean;
  amount_unusual: boolean;
  currency_consistent: boolean;
  reasons: string[];
};

/** §9.3 Supplier identity check */
export type SupplierIdentityResult = {
  known_supplier: boolean;
  new_supplier: boolean;
  name_match: boolean;
  email_domain_match: boolean;
  country_match: boolean;
  reasons: string[];
};

/** §9.4 Payment destination check */
export type PaymentDestinationResult = {
  destination_changed: boolean;
  destination_verified: boolean;
  on_risk_list: boolean;
  format_valid: boolean;
  reasons: string[];
};

/** §9.5 Fraud language check */
export type FraudLanguageResult = {
  urgency_detected: boolean;
  pressure_detected: boolean;
  secrecy_detected: boolean;
  changed_payment_details_detected: boolean;
  fraud_pattern?: string;
};

/** §9.6 Payment behavior anomaly check */
export type PaymentBehaviorAnomalyResult = {
  amount_percentile_for_sme: number;
  new_supplier: boolean;
  new_country: boolean;
  new_payment_rail: boolean;
  first_stablecoin_payment: boolean;
  payment_attempted_too_quickly: boolean;
};

/** Aggregated results of every individual pipeline stage. */
export type FraudChecks = {
  completeness: InvoiceCompletenessResult;
  amount_consistency: AmountConsistencyResult;
  supplier_identity: SupplierIdentityResult;
  payment_destination: PaymentDestinationResult;
  fraud_language: FraudLanguageResult;
  behavior_anomaly: PaymentBehaviorAnomalyResult;
};

/** §9.7 Final fraud score — the component's primary output. */
export type FraudCheckResult = {
  fraud_risk_score: number;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  top_reasons: string[];
  checks: FraudChecks;
};

/** Input bundle handed to the fraud engine. */
export type FraudCheckInput = {
  invoice: Invoice;
  context?: FraudCheckContext;
};
