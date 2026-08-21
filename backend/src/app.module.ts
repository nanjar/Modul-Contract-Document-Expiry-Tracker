import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { ReminderModule } from './reminders/reminder.module';
import { UsersModule } from './users/users.module';
import { DocumentFilesController } from './documents/document-files.controller';
import { RemindersController } from './reminders/reminders.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, AuditModule, DashboardModule, DocumentsModule, StorageModule, ReminderModule, UsersModule],
  controllers: [DocumentFilesController, RemindersController],
})
export class AppModule {}
