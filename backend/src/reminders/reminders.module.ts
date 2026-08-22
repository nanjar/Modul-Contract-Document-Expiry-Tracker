import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RemindersController } from './reminders.controller';
import { RemindersOverviewController } from './reminders-overview.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [RemindersController, RemindersOverviewController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
