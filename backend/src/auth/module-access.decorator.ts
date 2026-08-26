import { SetMetadata } from '@nestjs/common';
import { ModuleKey } from '@prisma/client';

export const MODULE_ACCESS_KEY = 'module_access';
export type ModuleAccessRequirement = {
  module: ModuleKey;
  permission?: string;
};

export const ModuleAccess = (module: ModuleKey, permission?: string) =>
  SetMetadata(MODULE_ACCESS_KEY, { module, permission } satisfies ModuleAccessRequirement);
