import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListDocumentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentType?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NO_EXPIRY', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsBooleanString()
  includeArchived = 'false';
}
