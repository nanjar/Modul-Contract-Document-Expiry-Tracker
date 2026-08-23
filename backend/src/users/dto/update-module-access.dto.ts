import { ArrayUnique, IsArray, IsEnum, IsString } from 'class-validator';
import { ModuleKey } from '@prisma/client';

export class UpdateModuleAccessDto {
  @IsEnum(ModuleKey)
  module!: ModuleKey;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions!: string[];
}
