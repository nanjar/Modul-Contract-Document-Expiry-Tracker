import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OfficeAutomationController } from './office-automation.controller';
import { OfficeAutomationService } from './office-automation.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [OfficeAutomationController],
  providers: [OfficeAutomationService],
  exports: [OfficeAutomationService],
})
export class OfficeAutomationModule {}
