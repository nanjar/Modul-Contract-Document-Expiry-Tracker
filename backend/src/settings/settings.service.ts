import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const WARNING_THRESHOLD_KEY = 'warning_threshold_days';
const DEFAULT_WARNING_THRESHOLD_DAYS = 30;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getWarningThresholdDays() {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: WARNING_THRESHOLD_KEY } });
    const parsed = Number(setting?.value ?? DEFAULT_WARNING_THRESHOLD_DAYS);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 3650 ? parsed : DEFAULT_WARNING_THRESHOLD_DAYS;
  }

  async getAll() {
    const threshold = await this.getWarningThresholdDays();
    return {
      warningThresholdDays: threshold,
      defaultReminderDays: [90, 30, 14, 7, 1],
      notificationEmailMode: process.env.NOTIFICATION_EMAIL_MODE || 'console',
    };
  }

  async update(input: { warningThresholdDays: number }, actorId: string) {
    const days = Number(input.warningThresholdDays);
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      throw new BadRequestException('warningThresholdDays must be an integer between 0 and 3650');
    }

    const previous = await this.getWarningThresholdDays();
    await this.prisma.systemSetting.upsert({
      where: { key: WARNING_THRESHOLD_KEY },
      update: { value: String(days) },
      create: { key: WARNING_THRESHOLD_KEY, value: String(days) },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'SystemSetting',
      entityId: WARNING_THRESHOLD_KEY,
      metadata: { previous: { warningThresholdDays: previous }, current: { warningThresholdDays: days } },
    });

    return this.getAll();
  }
}
