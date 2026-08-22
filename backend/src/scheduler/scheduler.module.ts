import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReminderScheduler } from './reminder.scheduler';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [ReminderScheduler],
})
export class SchedulerModule {}
