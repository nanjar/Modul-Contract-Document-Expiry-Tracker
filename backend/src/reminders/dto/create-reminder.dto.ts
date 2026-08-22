import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class CreateReminderDto {
  @IsInt()
  @Min(1)
  @Max(3650)
  daysBefore!: number;

  @IsBoolean()
  enabled = true;
}
