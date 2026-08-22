import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processDueReminders() {
    if (this.running) {
      this.logger.warn('Reminder scheduler skipped because a previous run is still active');
      return;
    }

    this.running = true;

    try {
      const now = new Date();
      const reminders = await this.prisma.reminder.findMany({
        where: {
          enabled: true,
          lastSentAt: null,
          document: {
            archivedAt: null,
            reminderEnabled: true,
            expiryDate: { gt: now },
          },
        },
        select: {
          id: true,
          daysBefore: true,
          document: { select: { id: true, expiryDate: true } },
        },
      });

      let processed = 0;

      for (const reminder of reminders) {
        if (!reminder.document.expiryDate) continue;

        const expiry = new Date(reminder.document.expiryDate);
        const dueAt = new Date(expiry);
        dueAt.setDate(dueAt.getDate() - reminder.daysBefore);

        if (now < dueAt || now >= expiry) continue;

        const result = await this.notifications.sendExpiryReminder(reminder.id);
        if (result.sent) processed += 1;
      }

      if (processed > 0) {
        this.logger.log(`Processed ${processed} due document expiry reminder(s)`);
      }
    } catch (error) {
      this.logger.error('Reminder scheduler failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
