import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleKey, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccess } from '../auth/module-access.decorator';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller('documents/:documentId/reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.EDITOR, Role.VIEWER)
  @ModuleAccess(ModuleKey.CONTRACT_DOCUMENT, 'DOCUMENT_VIEW')
  list(@Param('documentId') documentId: string) {
    return this.reminders.list(documentId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.EDITOR)
  @ModuleAccess(ModuleKey.CONTRACT_DOCUMENT, 'DOCUMENT_REMINDER_MANAGE')
  create(@Param('documentId') documentId: string, @Body() dto: CreateReminderDto, @Req() req: any) {
    return this.reminders.create(documentId, dto, req.user.sub);
  }

  @Patch(':reminderId')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  @ModuleAccess(ModuleKey.CONTRACT_DOCUMENT, 'DOCUMENT_REMINDER_MANAGE')
  update(@Param('reminderId') reminderId: string, @Body() dto: UpdateReminderDto, @Req() req: any) {
    return this.reminders.update(reminderId, dto, req.user.sub);
  }

  @Delete(':reminderId')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  @ModuleAccess(ModuleKey.CONTRACT_DOCUMENT, 'DOCUMENT_REMINDER_MANAGE')
  remove(@Param('reminderId') reminderId: string, @Req() req: any) {
    return this.reminders.remove(reminderId, req.user.sub);
  }
}
