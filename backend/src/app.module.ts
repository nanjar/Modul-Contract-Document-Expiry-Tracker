import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { ProfileModule } from './profile/profile.module';
import { OfficeAutomationModule } from './office-automation/office-automation.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    DashboardModule,
    DocumentsModule,
    NotificationsModule,
    SchedulerModule,
    StorageModule,
    UsersModule,
    SettingsModule,
    ProfileModule,
    OfficeAutomationModule,
    IntegrationsModule,
    EmployeesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
