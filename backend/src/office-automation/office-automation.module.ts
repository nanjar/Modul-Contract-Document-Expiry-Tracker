import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { OfficeAutomationController } from './office-automation.controller';
import { OfficeAutomationService } from './office-automation.service';
import { OfficeAutomationQueryService } from './office-automation-query.service';
import { OfficeAttachmentService } from './office-attachment.service';
import { OfficeRequestRulesService } from './office-request-rules.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule, UsersModule],
  controllers: [OfficeAutomationController, AttendanceController],
  providers: [OfficeAutomationService, OfficeAutomationQueryService, OfficeAttachmentService, OfficeRequestRulesService, AttendanceService],
  exports: [OfficeAutomationService, OfficeAutomationQueryService, OfficeAttachmentService, OfficeRequestRulesService, AttendanceService],
})
export class OfficeAutomationModule {}
