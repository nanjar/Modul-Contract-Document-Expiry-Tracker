import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { AttendanceAction } from '@prisma/client';

export class AttendanceActionDto {
  @IsEnum(AttendanceAction)
  action!: AttendanceAction;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
