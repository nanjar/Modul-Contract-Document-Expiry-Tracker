import { IsDateString, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { OfficeRequestType } from '@prisma/client';

export class CreateOfficeRequestDto {
  @IsEnum(OfficeRequestType)
  type!: OfficeRequestType;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  priority?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
