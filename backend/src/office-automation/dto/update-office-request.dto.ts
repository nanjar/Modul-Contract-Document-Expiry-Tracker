import { IsDateString, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { OfficeRequestStatus, OfficeRequestType } from '@prisma/client';

export class UpdateOfficeRequestDto {
  @IsOptional()
  @IsEnum(OfficeRequestType)
  type?: OfficeRequestType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsDateString()
  requiredDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  priority?: string;

  @IsOptional()
  @IsEnum(OfficeRequestStatus)
  status?: OfficeRequestStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
