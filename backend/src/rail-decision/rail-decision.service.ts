import { Injectable } from '@nestjs/common';
import type {
  Invoice,
  PaymentDestination,
  RequestedMethod,
} from '../common/types/invoice.types';
import type {
  PaymentRail,
  RailDecision,
  RailOption,
} from './rail-decision.types';

const PAYMENT_RAILS: PaymentRail[] = [
  'FPS',
  'CHATS_RTGS',
  'CIPS',
  'SWIFT',
  'STABLECOIN',
  'BANK_TRANSFER',
];

@Injectable()
export class RailDecisionService {
  decideRail(invoice: Invoice): RailDecision {
    const railOptions = PAYMENT_RAILS.map((rail) =>
      buildRailOption(rail, invoice),
    );
    const recommendedOption = railOptions.find(
      (option) => option.status === 'RECOMMENDED',
    );

    return {
      recommended_rail: recommendedOption?.rail ?? 'NONE',
      summary: buildDecisionSummary(recommendedOption),
      rail_options: railOptions,
    };
  }
}

function buildRailOption(rail: PaymentRail, invoice: Invoice): RailOption {
  const requestedMethod = invoice.payment.requested_method;
  const fitReason = getRailFitReason(rail, invoice);

  if (requestedMethod === rail) {
    return {
      rail,
      status: fitReason ? 'RECOMMENDED' : 'BLOCKED',
      reason:
        fitReason ??
        `${formatRail(rail)} was requested, but the invoice is missing required payment details for this rail.`,
    };
  }

  if (requestedMethod === 'UNKNOWN') {
    return {
      rail,
      status: fitReason ? 'AVAILABLE' : 'NOT_SUITABLE',
      reason:
        fitReason ??
        `${formatRail(rail)} is not suitable because the invoice does not include matching rail details.`,
    };
  }

  return {
    rail,
    status: fitReason ? 'AVAILABLE' : 'NOT_SUITABLE',
    reason: fitReason
      ? `${formatRail(rail)} can support this invoice, but ${formatRequestedMethod(
          requestedMethod,
        )} was requested.`
      : `${formatRail(rail)} is not suitable for the requested ${formatRequestedMethod(
          requestedMethod,
        )} payment.`,
  };
}

function getRailFitReason(rail: PaymentRail, invoice: Invoice): string | null {
  const { currency, destination } = invoice.payment;
  const payerCountry = normalizeCountry(invoice.payer.country);
  const supplierCountry = normalizeCountry(invoice.supplier.country);

  switch (rail) {
    case 'FPS':
      if (
        currency === 'HKD' &&
        isHongKongCountry(payerCountry) &&
        isHongKongCountry(supplierCountry) &&
        hasFpsDestination(destination)
      ) {
        return 'FPS fits this HKD domestic Hong Kong invoice with FPS payment details.';
      }

      return null;

    case 'CHATS_RTGS':
      if (
        isHongKongCountry(payerCountry) &&
        isHongKongCountry(supplierCountry) &&
        ['HKD', 'USD', 'EUR', 'CNY'].includes(currency) &&
        hasBankAccountDestination(destination)
      ) {
        return 'CHATS RTGS fits this Hong Kong bank transfer invoice.';
      }

      return null;

    case 'CIPS':
      if (
        ['CNY', 'RMB'].includes(currency) &&
        (isChinaCountry(payerCountry) || isChinaCountry(supplierCountry)) &&
        hasBankAccountDestination(destination)
      ) {
        return 'CIPS fits this renminbi invoice involving mainland China bank details.';
      }

      return null;

    case 'SWIFT':
      if (hasSwiftDestination(destination) || hasIbanDestination(destination)) {
        return 'SWIFT fits this invoice because it includes SWIFT or IBAN payment details.';
      }

      return null;

    case 'STABLECOIN':
      if (hasStablecoinDestination(destination)) {
        return 'Stablecoin rail fits this invoice because it includes wallet or network details.';
      }

      return null;

    case 'BANK_TRANSFER':
      if (hasBankAccountDestination(destination)) {
        return 'Bank transfer fits this invoice because it includes bank account details.';
      }

      return null;

    case 'NONE':
      return null;
  }
}

function buildDecisionSummary(recommendedOption: RailOption | undefined): string {
  if (!recommendedOption) {
    return 'No payment rail can be recommended from the invoice details.';
  }

  return `${formatRail(recommendedOption.rail)} is recommended. ${
    recommendedOption.reason
  }`;
}

function hasFpsDestination(destination: PaymentDestination): boolean {
  return (
    ('fps_id' in destination && hasKnownValue(destination.fps_id)) ||
    ('proxy_value' in destination && hasKnownValue(destination.proxy_value))
  );
}

function hasBankAccountDestination(destination: PaymentDestination): boolean {
  return (
    'account_number' in destination && hasKnownValue(destination.account_number)
  );
}

function hasSwiftDestination(destination: PaymentDestination): boolean {
  return 'swift_bic' in destination && hasKnownValue(destination.swift_bic);
}

function hasIbanDestination(destination: PaymentDestination): boolean {
  return 'iban' in destination && hasKnownValue(destination.iban);
}

function hasStablecoinDestination(destination: PaymentDestination): boolean {
  return (
    ('value' in destination && hasKnownValue(destination.value)) ||
    ('network' in destination && hasKnownValue(destination.network))
  );
}

function hasKnownValue(value: string | undefined): boolean {
  return !!value && value.trim().toUpperCase() !== 'UNKNOWN';
}

function normalizeCountry(country: string): string {
  return country.trim().toUpperCase();
}

function isHongKongCountry(country: string): boolean {
  return country === 'HK' || country === 'HONG KONG';
}

function isChinaCountry(country: string): boolean {
  return (
    country === 'CN' ||
    country === 'CHINA' ||
    country === 'MAINLAND CHINA' ||
    country === "PEOPLE'S REPUBLIC OF CHINA"
  );
}

function formatRail(rail: PaymentRail): string {
  switch (rail) {
    case 'FPS':
      return 'FPS';
    case 'CHATS_RTGS':
      return 'CHATS RTGS';
    case 'CIPS':
      return 'CIPS';
    case 'SWIFT':
      return 'SWIFT';
    case 'STABLECOIN':
      return 'stablecoin rail';
    case 'BANK_TRANSFER':
      return 'bank transfer';
    case 'NONE':
      return 'no rail';
  }
}

function formatRequestedMethod(requestedMethod: RequestedMethod): string {
  return requestedMethod === 'UNKNOWN'
    ? 'unknown'
    : formatRail(requestedMethod);
}
