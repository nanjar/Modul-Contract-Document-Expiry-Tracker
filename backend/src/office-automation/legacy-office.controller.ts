import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnnouncementRecipientType, Role } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccess } from '../auth/module-access.decorator';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { ModuleKey } from '@prisma/client';
import { LegacyOfficeService } from './legacy-office.service';

class CreateAnnouncementDto {
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(10000) message!: string;
  @IsOptional() @IsEnum(AnnouncementRecipientType) recipientType?: AnnouncementRecipientType;
  @IsOptional() @IsEnum(Role) recipientRole?: Role;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsUUID() userId?: string;
}

class CreateRoomDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
}

class CreateBookingDto {
  @IsUUID() roomId!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) attendeeIds?: string[];
}

@ApiTags('office-legacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@ModuleAccess(ModuleKey.OFFICE_AUTOMATION)
@Controller('office-automation')
export class LegacyOfficeController {
  constructor(private readonly legacy: LegacyOfficeService) {}

  @Get('announcements')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  announcements(@Req() req: any) { return this.legacy.listAnnouncements(req.user.sub); }

  @Get('announcements/:id')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  announcement(@Param('id') id: string, @Req() req: any) { return this.legacy.announcement(id, req.user.sub); }

  @Post('announcements')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_EDIT')
  createAnnouncement(@Body() dto: CreateAnnouncementDto, @Req() req: any) { return this.legacy.createAnnouncement({ ...dto, actorId: req.user.sub }); }

  @Post('announcements/:id/publish')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_EDIT')
  publishAnnouncement(@Param('id') id: string, @Req() req: any) { return this.legacy.publishAnnouncement(id, req.user.sub); }

  @Post('announcements/:id/read')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  readAnnouncement(@Param('id') id: string, @Req() req: any) { return this.legacy.markAnnouncementRead(id, req.user.sub); }

  @Get('meeting-rooms')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  rooms() { return this.legacy.listRooms(); }

  @Post('meeting-rooms')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_TASK_ASSIGN')
  createRoom(@Body() dto: CreateRoomDto, @Req() req: any) { return this.legacy.createRoom({ ...dto, actorId: req.user.sub }); }

  @Get('meeting-bookings')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  bookings(@Req() req: any, @Query('all') all?: string) { return this.legacy.listBookings(req.user.sub, all === 'true' && ['SUPERUSER','EDITOR'].includes(req.user.role)); }

  @Post('meeting-bookings')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_CREATE')
  createBooking(@Body() dto: CreateBookingDto, @Req() req: any) { return this.legacy.createBooking({ ...dto, actorId: req.user.sub }); }

  @Patch('meeting-bookings/:id/cancel')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_EDIT')
  cancelBooking(@Param('id') id: string, @Req() req: any) { return this.legacy.cancelBooking(id, req.user.sub); }
}
