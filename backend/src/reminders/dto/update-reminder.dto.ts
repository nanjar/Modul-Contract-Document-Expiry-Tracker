import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateReminderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  daysBefore?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
