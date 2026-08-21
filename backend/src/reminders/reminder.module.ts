import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { RemindersController } from './reminders.controller';
import { ReminderService } from './reminder.service';

@Module({ imports: [ScheduleModule.forRoot(), PrismaModule], controllers: [RemindersController], providers: [ReminderService], exports: [ReminderService] })
export class ReminderModule {}
