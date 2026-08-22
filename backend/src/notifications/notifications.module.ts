import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailNotificationProvider } from './email.provider';
import { ResendNotificationProvider } from './resend.provider';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ResendNotificationProvider, EmailNotificationProvider, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
