import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTelegramIdentityDto {
  @IsString()
  @MinLength(1)
  chatId!: string;

  @IsOptional()
  @IsString()
  username?: string;
}
