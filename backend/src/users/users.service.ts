import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

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
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    return user;
  }

  async update(id: string, input: {
    email?: string;
    name?: string;
    password?: string;
    role?: Role;
    isActive?: boolean;
  }, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const email = input.email?.toLowerCase().trim();
    if (email && email !== existing.email) {
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate) {
        throw new ConflictException('Email is already registered');
      }
    }

    const passwordHash = input.password
      ? await argon2.hash(input.password)
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(email !== undefined ? { email } : {}),
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

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (existing.id === actorId) {
      throw new ConflictException('You cannot deactivate your own account');
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
}
