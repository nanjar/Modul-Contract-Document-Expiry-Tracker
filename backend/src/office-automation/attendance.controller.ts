import { Body, Controller, Get, Query, Req, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModuleKey } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccess } from '../auth/module-access.decorator';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { AttendanceActionDto } from './dto/attendance-action.dto';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@ModuleAccess(ModuleKey.OFFICE_AUTOMATION)
@Controller('office/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('today')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  today(@Req() req: any) { return this.attendance.today(req.user.sub); }

  @Get('history')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  history(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) { return this.attendance.history(req.user.sub, from, to); }

  @Post('action')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_CREATE')
  action(@Req() req: any, @Body() dto: AttendanceActionDto) { return this.attendance.action(req.user.sub, dto); }
}
