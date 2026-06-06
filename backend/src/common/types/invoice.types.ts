export type RequestedMethod =
  | 'FPS'
  | 'CHATS_RTGS'
  | 'CIPS'
  | 'SWIFT'
  | 'STABLECOIN'
  | 'BANK_TRANSFER'
  | 'UNKNOWN';

export type FpsDestination = {
  fps_id?: string;
  proxy_type?: 'PHONE' | 'EMAIL';
  proxy_value?: string;
};

export type ChatsRtgsDestination = {
  bank_name: string;
  account_number: string;
  bank_code?: string;
  branch_code?: string;
};

export type CipsDestination = {
  bank_name: string;
  account_number: string;
  cnaps_code?: string;
};

export type SwiftDestination = {
  iban?: string;
  account_number?: string;
  swift_bic: string;
  bank_name?: string;
};

export type StablecoinDestination = {
  value: string;
  network: string;
  token_symbol?: string;
};

export type BankTransferDestination = {
  bank_name: string;
  account_number: string;
  bank_code?: string;
  branch_code?: string;
};

export type UnknownDestination = {
  raw_text?: string;
};

export type PaymentDestination =
  | FpsDestination
  | ChatsRtgsDestination
  | CipsDestination
  | SwiftDestination
  | StablecoinDestination
  | BankTransferDestination
  | UnknownDestination;

export type Payment = {
  amount: number;
  currency: string;
  purpose: string;
  requested_method: RequestedMethod;
  beneficiary_name: string;
  destination: PaymentDestination;
};

export type Payer = {
  name: string;
  country: string;
};

export type Supplier = {
  name: string;
  country: string;
  email?: string;
};

export type RiskSignals = {
  urgency_language: boolean;
  pressure_language: boolean;
  secrecy_language: boolean;
  payment_details_changed: boolean;
};

export type Invoice = {
  invoice_number: string;
  due_date: string;
  payer: Payer;
  supplier: Supplier;
  payment: Payment;
  risk_signals: RiskSignals;
};