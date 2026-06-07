import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AuditComplianceCheckDto {
  @IsString() check: string;
  @IsString() status: string;
  @IsString() detail: string;
}

export class AuditInvoiceDto {
  @IsString() invoice_number: string;
  @IsString() supplier_name: string;
  @IsString() supplier_country: string;
  @IsNumber() amount: number;
  @IsString() currency: string;
  @IsString() recommended_rail: string;
  @IsString() rail_reason: string;
  @IsNumber() fraud_score: number;
  @IsString() fraud_level: string;

  @IsArray()
  @IsString({ each: true })
  fraud_reasons: string[];

  @IsString() compliance_status: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuditComplianceCheckDto)
  compliance_checks: AuditComplianceCheckDto[];

  @IsBoolean() held: boolean;

  @IsOptional() @IsString() payer_name?: string;
}
