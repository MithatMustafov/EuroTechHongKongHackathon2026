import { Type } from 'class-transformer';
import {
  IsBoolean, IsDefined, IsNotEmpty, IsNumber, IsObject, IsOptional,
  IsString, Min, ValidateNested,
} from 'class-validator';

export class PayerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() country: string;
}

export class SupplierDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() country: string;
  @IsString() @IsOptional() email?: string;
}

export class PaymentDestinationDto {
  @IsString() @IsOptional() bank_name?: string;
  @IsString() @IsOptional() account_number?: string;
  @IsString() @IsOptional() cnaps_code?: string;
}

export class PaymentDto {
  @IsNumber() @Min(0) amount: number;
  @IsString() @IsNotEmpty() currency: string;
  @IsString() @IsNotEmpty() purpose: string;
  @IsString() @IsOptional() requested_method?: string;
  @IsString() @IsOptional() beneficiary_name?: string;
  @IsOptional() @ValidateNested() @Type(() => PaymentDestinationDto)
  destination?: PaymentDestinationDto;
  @IsBoolean() @IsOptional() stablecoin_wallet_verified?: boolean;
}

export class RiskSignalsDto {
  @IsBoolean() urgency_language: boolean;
  @IsBoolean() pressure_language: boolean;
  @IsBoolean() secrecy_language: boolean;
  @IsBoolean() payment_details_changed: boolean;
}

export class AnalyzeInvoiceDto {
  @IsString() @IsNotEmpty() invoice_number: string;
  @IsString() @IsOptional() due_date?: string;

  @IsDefined() @IsObject() @ValidateNested() @Type(() => PayerDto)
  payer: PayerDto;

  @IsDefined() @IsObject() @ValidateNested() @Type(() => SupplierDto)
  supplier: SupplierDto;

  @IsDefined() @IsObject() @ValidateNested() @Type(() => PaymentDto)
  payment: PaymentDto;

  @IsOptional() @ValidateNested() @Type(() => RiskSignalsDto)
  risk_signals?: RiskSignalsDto;
}
