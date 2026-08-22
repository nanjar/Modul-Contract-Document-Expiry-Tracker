import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export const DEFAULT_REMINDER_DAYS = [90, 30, 14, 7, 1];

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(documentId: string) {
    await this.assertDocument(documentId);
    return this.prisma.reminder.findMany({ where: { documentId }, orderBy: { daysBefore: 'desc' } });
  }

  async listAll(query: { enabled?: boolean; page: number; limit: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const where: any = { document: { archivedAt: null } };
    if (query.enabled !== undefined) where.enabled = query.enabled;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.reminder.findMany({
        where,
        include: { document: { select: { id: true, title: true, documentType: true, expiryDate: true, reminderEnabled: true, owner: { select: { name: true, email: true } } } } },
        orderBy: [{ enabled: 'desc' }, { daysBefore: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.reminder.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(documentId: string, input: { daysBefore: number; enabled: boolean }, actorId: string) {
    await this.assertDocument(documentId);
    const existing = await this.prisma.reminder.findUnique({ where: { documentId_daysBefore: { documentId, daysBefore: input.daysBefore } } });
    if (existing) throw new ConflictException('Reminder already exists for this interval');
    const reminder = await this.prisma.reminder.create({ data: { documentId, daysBefore: input.daysBefore, enabled: input.enabled } });
    await this.audit.log({ actorId, action: 'CREATE', entity: 'Reminder', entityId: reminder.id, metadata: { documentId, daysBefore: reminder.daysBefore, enabled: reminder.enabled } });
    return reminder;
  }

  async update(reminderId: string, input: { daysBefore?: number; enabled?: boolean }, actorId: string) {
    const existing = await this.prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!existing) throw new NotFoundException('Reminder not found');
    if (input.daysBefore !== undefined && input.daysBefore !== existing.daysBefore) {
      const duplicate = await this.prisma.reminder.findUnique({ where: { documentId_daysBefore: { documentId: existing.documentId, daysBefore: input.daysBefore } } });
      if (duplicate) throw new ConflictException('Reminder already exists for this interval');
    }
    const reminder = await this.prisma.reminder.update({ where: { id: reminderId }, data: { ...(input.daysBefore !== undefined ? { daysBefore: input.daysBefore } : {}), ...(input.enabled !== undefined ? { enabled: input.enabled } : {}) } });
    await this.audit.log({ actorId, action: 'UPDATE', entity: 'Reminder', entityId: reminder.id, metadata: { previous: { daysBefore: existing.daysBefore, enabled: existing.enabled }, current: { daysBefore: reminder.daysBefore, enabled: reminder.enabled } } });
    return reminder;
  }

  async remove(reminderId: string, actorId: string) {
    const existing = await this.prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!existing) throw new NotFoundException('Reminder not found');
    await this.prisma.reminder.delete({ where: { id: reminderId } });
    await this.audit.log({ actorId, action: 'DELETE', entity: 'Reminder', entityId: reminderId, metadata: { documentId: existing.documentId, daysBefore: existing.daysBefore } });
    return { success: true };
  }

  async createDefaults(documentId: string) {
    const document = await this.assertDocument(documentId);
    if (!document.expiryDate || !document.reminderEnabled) return [];
    return this.prisma.$transaction(DEFAULT_REMINDER_DAYS.map((daysBefore) => this.prisma.reminder.upsert({ where: { documentId_daysBefore: { documentId, daysBefore } }, update: {}, create: { documentId, daysBefore, enabled: true } })));
  }

  /**
   * Re-anchors reminder delivery state when the document expiry lifecycle
   * changes. A reminder that was already sent for the old expiry must not
   * suppress delivery for the new expiry date.
   */
  async resetDeliveryState(documentId: string, enableDefaults = false) {
    await this.prisma.reminder.updateMany({
      where: { documentId },
      data: { lastSentAt: null, processingAt: null },
    });

    if (enableDefaults) {
      await this.prisma.reminder.updateMany({
        where: { documentId, daysBefore: { in: DEFAULT_REMINDER_DAYS } },
        data: { enabled: true },
      });
    }
  }

  private async assertDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId }, select: { id: true, archivedAt: true, expiryDate: true, reminderEnabled: true } });
    if (!document || document.archivedAt) throw new NotFoundException('Document not found');
    return document;
  }
}
