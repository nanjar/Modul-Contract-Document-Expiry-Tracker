import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leaveQuota?: number;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  managerId?: string | null;
}
