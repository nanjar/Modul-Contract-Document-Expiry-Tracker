import { Injectable } from '@nestjs/common';
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
        ...(input.metadata !== undefined
          ? { metadata: input.metadata }
          : {}),
      },
    });
  }
}
