import type { RiskSignals } from '../common/types/invoice.types';

const URGENCY_PATTERN =
  /\b(urgent|urgently|immediately|asap|right away|today|due today|send today|pay today|same day|same-day|without delay|time sensitive|expedite|critical|final reminder)\b/i;
const PRESSURE_PATTERN =
  /\b(final notice|final reminder|overdue|avoid cancellation|avoid shipment cancellation|shipment (?:will be )?cancelled|shipment cancellation|release goods|release shipment|release the shipment|must pay|must be received today|do not delay|late penalty|penalt(?:y|ies)|suspend|hold shipment|conditional on same-day confirmation)\b/i;
const SECRECY_PATTERN =
  /\b(confidential|do not share|keep this between us|keep this private|secret|do not call|do not use previous contact|reply only|only communicate through this email|only to this email thread|do not contact|do not disclose|private)\b/i;
const PAYMENT_CHANGED_PATTERN =
  /\b(payment details (?:have )?changed|bank details changed|new bank details|new payment details|updated bank details|updated settlement account|revised invoice|revised payment instructions|account changed|new account|new bank account|new beneficiary|changed wallet|wallet changed|new wallet|use this new account|use this account instead|replaces all previous payment instructions|do not use previous payment details|do not use previous account|do not use previous iban)\b/i;

export function extractRiskSignals(text: string): RiskSignals {
  return {
    urgency_language: URGENCY_PATTERN.test(text),
    pressure_language: PRESSURE_PATTERN.test(text),
    secrecy_language: SECRECY_PATTERN.test(text),
    payment_details_changed: PAYMENT_CHANGED_PATTERN.test(text),
  };
}
