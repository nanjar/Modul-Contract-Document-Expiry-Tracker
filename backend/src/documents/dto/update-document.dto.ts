import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentType?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;
}
