import { Controller, Get, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class ReminderDto {
  @IsInt() @Min(1) @Max(365) daysBefore!: number;
  @IsBoolean() enabled!: boolean;
}

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents/:documentId/reminders')
export class RemindersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get(@Param('documentId') documentId: string) { return this.prisma.reminder.findMany({ where: { documentId }, orderBy: { daysBefore: 'desc' } }); }

  @Post()
  @Roles(Role.SUPERUSER, Role.EDITOR)
  async upsert(@Param('documentId') documentId: string, @Body() body: ReminderDto, @Req() req: { user: { sub: string } }) {
    const reminder = await this.prisma.reminder.upsert({ where: { documentId_daysBefore: { documentId, daysBefore: body.daysBefore } }, create: { documentId, daysBefore: body.daysBefore, enabled: body.enabled }, update: { enabled: body.enabled } });
    await this.prisma.auditLog.create({ data: { actorId: req.user.sub, action: 'REMINDER_CHANGED', entity: 'Reminder', entityId: reminder.id, metadata: { documentId, daysBefore: reminder.daysBefore, enabled: reminder.enabled, source: 'web' } } });
    return reminder;
  }
}
