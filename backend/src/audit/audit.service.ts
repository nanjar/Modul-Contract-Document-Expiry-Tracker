import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });
  }

  async list(query: {
    action?: string;
    entity?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const action = query.action?.trim();
    const entity = query.entity?.trim();
    const entityId = query.entityId?.trim();

    const where = {
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...(entity ? { entity: { contains: entity, mode: 'insensitive' as const } } : {}),
      ...(entityId ? { entityId: { contains: entityId, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const audit = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException('Audit log not found');
    }

    return audit;
  }
}
