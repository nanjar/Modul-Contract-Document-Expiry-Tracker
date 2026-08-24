import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { OfficeAutomationController } from './office-automation.controller';
import { OfficeAutomationService } from './office-automation.service';
import { OfficeAutomationQueryService } from './office-automation-query.service';

@Module({
  imports: [AuthModule, PrismaModule, UsersModule],
  controllers: [OfficeAutomationController],
  providers: [OfficeAutomationService, OfficeAutomationQueryService],
  exports: [OfficeAutomationService, OfficeAutomationQueryService],
})
export class OfficeAutomationModule {}
