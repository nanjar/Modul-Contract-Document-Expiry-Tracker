import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  warningThresholdDays!: number;
}
