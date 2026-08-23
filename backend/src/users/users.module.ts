import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TelegramIdentityService } from './telegram-identity.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService, TelegramIdentityService],
  exports: [UsersService, TelegramIdentityService],
})
export class UsersModule {}
