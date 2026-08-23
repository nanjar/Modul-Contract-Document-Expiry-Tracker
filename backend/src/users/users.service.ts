import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ModuleKey, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async assertModuleAccess(userId: string, module: ModuleKey, permission?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        moduleAccess: {
          where: { module },
          select: { permissions: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('User is inactive or does not exist');
    }

    if (user.role === Role.SUPERUSER) return true;

    const access = user.moduleAccess[0];
    if (!access) throw new ForbiddenException('Module access is not granted');
    if (permission && !access.permissions.includes(permission)) {
      throw new ForbiddenException(`Module permission required: ${permission}`);
    }

    return true;
  }

  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        moduleAccess: true,
        telegramIdentities: {
          select: { chatId: true, username: true, isVerified: true },
        },
      },
    });

    return { items: users };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        moduleAccess: true,
        telegramIdentities: {
          select: { chatId: true, username: true, isVerified: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getModuleAccess(userId: string) {
    await this.assertUserExists(userId);
    return this.prisma.userModuleAccess.findMany({
      where: { userId },
      orderBy: { module: 'asc' },
    });
  }

  async updateModuleAccess(
    userId: string,
    input: { module: ModuleKey; permissions: string[] },
    actorId: string,
  ) {
    await this.assertUserExists(userId);

    const existing = await this.prisma.userModuleAccess.findUnique({
      where: { userId_module: { userId, module: input.module } },
    });

    const access = await this.prisma.userModuleAccess.upsert({
      where: { userId_module: { userId, module: input.module } },
      create: {
        userId,
        module: input.module,
        permissions: [...new Set(input.permissions)],
      },
      update: { permissions: [...new Set(input.permissions)] },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'UserModuleAccess',
      entityId: access.id,
      metadata: {
        userId,
        module: input.module,
        previousPermissions: existing?.permissions ?? [],
        permissions: access.permissions,
      },
    });

    return access;
  }

  async create(input: {
    email: string;
    name: string;
    password: string;
    role: Role;
    actorId: string;
  }) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorId: input.actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return user;
  }

  async update(
    id: string,
    input: {
      name?: string;
      password?: string;
      role?: Role;
      isActive?: boolean;
    },
    actorId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.id === actorId && input.isActive === false) {
      throw new ConflictException('You cannot deactivate your own account');
    }
    if (existing.id === actorId && input.role && input.role !== existing.role) {
      throw new ConflictException('You cannot change your own role');
    }

    const removingSuperuserAccess =
      existing.role === Role.SUPERUSER &&
      existing.isActive &&
      ((input.role !== undefined && input.role !== Role.SUPERUSER) ||
        input.isActive === false);

    if (removingSuperuserAccess) await this.assertNotLastActiveSuperuser(id);

    const passwordHash = input.password
      ? await argon2.hash(input.password)
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      metadata: {
        previous: {
          email: existing.email,
          name: existing.name,
          role: existing.role,
          isActive: existing.isActive,
        },
        current: {
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });

    return user;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.id === actorId) {
      throw new ConflictException('You cannot deactivate your own account');
    }
    if (existing.role === Role.SUPERUSER && existing.isActive) {
      await this.assertNotLastActiveSuperuser(id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'DELETE',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    });

    return user;
  }

  private async assertUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  private async assertNotLastActiveSuperuser(id: string) {
    const activeSuperusers = await this.prisma.user.count({
      where: { role: Role.SUPERUSER, isActive: true },
    });

    if (activeSuperusers <= 1) {
      throw new ConflictException(
        'At least one active superuser account must remain',
      );
    }
  }
}
