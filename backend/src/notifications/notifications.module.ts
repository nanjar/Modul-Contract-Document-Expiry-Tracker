import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailNotificationProvider } from './email.provider';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [EmailNotificationProvider, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
