import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus } from '../documents.types';

export class ListDocumentsQueryDto {
  @ApiPropertyOptional({
    description: 'Search by title, document number, or counterparty',
    example: 'Biznet',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: DocumentStatus,
    example: DocumentStatus.EXPIRING_SOON,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'Filter by document type',
    example: 'CONTRACT',
  })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
