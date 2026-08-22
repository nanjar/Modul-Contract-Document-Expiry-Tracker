import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationProvider } from './email.provider';

const PROCESSING_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailNotificationProvider,
  ) {}

  async sendExpiryReminder(reminderId: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        document: {
          include: {
            owner: { select: { id: true, email: true, name: true, isActive: true } },
            createdBy: { select: { id: true, email: true, name: true, isActive: true } },
          },
        },
      },
    });

    if (!reminder || !reminder.enabled || reminder.lastSentAt) {
      return { sent: false, reason: 'NOT_ELIGIBLE' as const };
    }

    const document = reminder.document;
    if (document.archivedAt || !document.reminderEnabled || !document.expiryDate) {
      return { sent: false, reason: 'DOCUMENT_NOT_ELIGIBLE' as const };
    }

    const now = new Date();
    const staleBefore = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);
    const claimedAt = now;

    const claimed = await this.prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        enabled: true,
        lastSentAt: null,
        OR: [{ processingAt: null }, { processingAt: { lt: staleBefore } }],
      },
      data: { processingAt: claimedAt },
    });

    if (claimed.count !== 1) {
      return { sent: false, reason: 'ALREADY_PROCESSING' as const };
    }

    const recipient = document.owner?.isActive
      ? document.owner
      : document.createdBy?.isActive
        ? document.createdBy
        : null;

    if (!recipient?.email) {
      await this.prisma.reminder.updateMany({
        where: { id: reminder.id, processingAt: claimedAt },
        data: { processingAt: null },
      });
      await this.audit.log({
        action: 'REMINDER_FAILED',
        entity: 'Reminder',
        entityId: reminder.id,
        metadata: { documentId: document.id, reason: 'NO_ACTIVE_RECIPIENT', daysBefore: reminder.daysBefore },
      });
      return { sent: false, reason: 'NO_ACTIVE_RECIPIENT' as const };
    }

    const expiryDate = new Date(document.expiryDate);
    const subject = `Document expiry reminder: ${document.title}`;
    const text = [
      `Document: ${document.title}`,
      `Type: ${document.documentType}`,
      `Expiry date: ${expiryDate.toISOString()}`,
      `Reminder: ${reminder.daysBefore} day(s) before expiry`,
    ].join('\n');

    try {
      const delivery = await this.email.send({
        to: recipient.email,
        subject,
        text,
        metadata: { reminderId: reminder.id, documentId: document.id, daysBefore: reminder.daysBefore },
      });

      const updated = await this.prisma.reminder.updateMany({
        where: { id: reminder.id, processingAt: claimedAt, lastSentAt: null },
        data: { lastSentAt: new Date(), processingAt: null },
      });

      if (updated.count !== 1) {
        return { sent: false, reason: 'ALREADY_PROCESSED' as const };
      }

      await this.audit.log({
        action: 'REMINDER_SENT',
        entity: 'Reminder',
        entityId: reminder.id,
        metadata: {
          documentId: document.id,
          recipient: recipient.email,
          daysBefore: reminder.daysBefore,
          messageId: delivery.messageId,
        },
      });

      return { sent: true, reminderId: reminder.id, messageId: delivery.messageId };
    } catch (error) {
      await this.prisma.reminder.updateMany({
        where: { id: reminder.id, processingAt: claimedAt, lastSentAt: null },
        data: { processingAt: null },
      });
      await this.audit.log({
        action: 'REMINDER_FAILED',
        entity: 'Reminder',
        entityId: reminder.id,
        metadata: {
          documentId: document.id,
          reason: 'DELIVERY_FAILED',
          daysBefore: reminder.daysBefore,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }
}
