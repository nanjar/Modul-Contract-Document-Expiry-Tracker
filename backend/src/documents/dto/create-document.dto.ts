import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(100)
  documentType!: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;
}
