import { IsBase64, IsIn, IsOptional, IsString } from 'class-validator';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export class ExtractInvoiceDto {
  @IsString() @IsBase64() file_base64: string;
  @IsString() @IsOptional() @IsIn(ALLOWED_MIME_TYPES) media_type?: string;
}
