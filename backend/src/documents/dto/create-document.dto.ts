import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(100)
  documentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterparty?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;
}
