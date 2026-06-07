import { IsOptional, IsString } from 'class-validator';

export class ExtractInvoiceDto {
  @IsString() file_base64: string;
  @IsString() @IsOptional() media_type?: string;
}
