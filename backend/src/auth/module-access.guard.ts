import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ModuleKey, Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  MODULE_ACCESS_KEY,
  ModuleAccessRequirement,
} from './module-access.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<ModuleAccessRequirement>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub as string | undefined;
    if (!userId) throw new ForbiddenException('Authenticated user is required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        moduleAccess: {
          where: { module: requirement.module },
          select: { permissions: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('User is inactive or does not exist');
    }

    if (user.role === Role.SUPERUSER) return true;

    const access = user.moduleAccess[0];
    if (!access) {
      throw new ForbiddenException(
        `Module access required: ${moduleLabel(requirement.module)}`,
      );
    }

    if (
      requirement.permission &&
      !access.permissions.includes(requirement.permission)
    ) {
      throw new ForbiddenException(
        `Module permission required: ${requirement.permission}`,
      );
    }

    return true;
  }
}

function moduleLabel(module: ModuleKey) {
  return module === ModuleKey.CONTRACT_DOCUMENT
    ? 'CONTRACT_DOCUMENT'
    : 'OFFICE_AUTOMATION';
}
