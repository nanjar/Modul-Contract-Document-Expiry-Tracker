import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  record(input: { actorId?: string; action: string; entity: string; entityId?: string; metadata?: unknown }) { return this.prisma.auditLog.create({ data: { actorId: input.actorId, action: input.action, entity: input.entity, entityId: input.entityId, metadata: input.metadata as any } }); }
  list(limit = 50) { return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(limit, 100), include: { actor: { select: { id: true, name: true, email: true, role: true } } } }); }
  async findOne(id: string) { const row = await this.prisma.auditLog.findUnique({ where: { id }, include: { actor: { select: { id: true, name: true, email: true, role: true } } } }); if (!row) throw new NotFoundException('Audit log not found'); return row; }
}
