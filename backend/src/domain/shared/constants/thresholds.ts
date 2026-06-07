export const THRESHOLDS = {
  // Payment rail limits (HKD)
  FPS_MAX_HKD:                    1_000_000,
  STABLECOIN_MAX_HKD:               500_000,
  CHATS_MIN_HKD:                    100_000,
  LARGE_TRANSFER_HKD:               500_000,

  // Fraud scoring — point values per rule
  FRAUD_URGENCY_POINTS:                  20,
  FRAUD_PRESSURE_POINTS:                 20,
  FRAUD_SECRECY_POINTS:                  25,
  FRAUD_DETAILS_CHANGED_POINTS:          30,
  FRAUD_LARGE_AMOUNT_POINTS:             10,
  FRAUD_IMMINENT_DUE_POINTS:             10,
  FRAUD_IMMINENT_DUE_DAYS:               3,

  // Fraud score thresholds
  FRAUD_HOLD_THRESHOLD:                  86,
  FRAUD_CRITICAL_THRESHOLD:             85,
  FRAUD_HIGH_THRESHOLD:                  60,
  FRAUD_MEDIUM_THRESHOLD:                30,
  FRAUD_MAX_SCORE:                      100,

  // Risk score thresholds (PDF pipeline)
  RISK_CRITICAL_THRESHOLD:              85,
  RISK_HIGH_THRESHOLD:                   60,
  RISK_MEDIUM_THRESHOLD:                 30,
  RISK_MAX_SCORE:                       100,

  // Final decision thresholds (PDF pipeline)
  DECISION_BLOCK_THRESHOLD:             95,
  DECISION_HOLD_THRESHOLD:              60,
  DECISION_WARN_THRESHOLD:              30,

  // Basel AML risk level cutoffs (0–10 scale)
  AML_CRITICAL_THRESHOLD:               8,
  AML_HIGH_THRESHOLD:                   6,
  AML_MEDIUM_THRESHOLD:                 4,

  // FX / caching
  FX_CACHE_TTL_MS:               3_600_000,
  FX_USD_HKD_FALLBACK:                7.78,
  MS_PER_DAY:                   86_400_000,
} as const;
