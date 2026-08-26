import { ArrayUnique, IsArray, IsEnum, IsIn, IsString } from 'class-validator';
import { ModuleKey } from '@prisma/client';
import { ALL_MODULE_PERMISSIONS } from '../../rbac/permissions';

export class UpdateModuleAccessDto {
  @IsEnum(ModuleKey)
  module!: ModuleKey;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(ALL_MODULE_PERMISSIONS as readonly string[], { each: true })
  permissions!: string[];
}
