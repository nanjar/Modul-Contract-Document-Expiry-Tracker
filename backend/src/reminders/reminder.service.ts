import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 * * * *')
  async processDueReminders() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const reminders = await this.prisma.reminder.findMany({ where: { enabled: true, document: { archivedAt: null, expiryDate: { not: null, gte: today } } }, include: { document: { include: { owner: true, createdBy: true } } } });

    for (const reminder of reminders) {
      const expiry = reminder.document.expiryDate!;
      const dueDate = new Date(expiry);
      dueDate.setUTCDate(dueDate.getUTCDate() - reminder.daysBefore);
      const dueDay = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
      if (dueDay.getTime() !== today.getTime()) continue;
      if (reminder.lastSentAt) {
        const lastDay = new Date(Date.UTC(reminder.lastSentAt.getUTCFullYear(), reminder.lastSentAt.getUTCMonth(), reminder.lastSentAt.getUTCDate()));
        if (lastDay.getTime() === today.getTime()) continue;
      }

      // Notification provider is intentionally abstract at this stage. The event is persisted first for idempotency.
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.reminder.findUnique({ where: { id: reminder.id } });
        if (!current || current.lastSentAt) return;
        await tx.reminder.update({ where: { id: reminder.id }, data: { lastSentAt: now } });
        await tx.auditLog.create({ data: { action: 'REMINDER_DUE', entity: 'Reminder', entityId: reminder.id, metadata: { documentId: reminder.documentId, daysBefore: reminder.daysBefore, recipientUserId: reminder.document.ownerId ?? reminder.document.createdById, event: 'DOCUMENT_EXPIRING' } } });
      });
      this.logger.log(`Reminder due for document ${reminder.documentId} (${reminder.daysBefore} days before expiry)`);
    }
  }
}
