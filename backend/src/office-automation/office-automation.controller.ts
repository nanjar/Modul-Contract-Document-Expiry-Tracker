import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOfficeRequestDto } from './dto/create-office-request.dto';
import { OfficeAutomationService } from './office-automation.service';

@ApiTags('office-automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('office-automation')
export class OfficeAutomationController {
  constructor(private readonly office: OfficeAutomationService) {}

  @Get('requests')
  list(@Req() req: any, @Query('all') all?: string) {
    const isPrivileged = req.user?.role === 'SUPERUSER' || req.user?.role === 'EDITOR';
    return this.office.list(isPrivileged && all === 'true' ? undefined : req.user.sub);
  }

  @Get('requests/:id')
  findOne(@Param('id') id: string) {
    return this.office.findOne(id);
  }

  @Post('requests')
  create(@Body() dto: CreateOfficeRequestDto, @Req() req: any) {
    return this.office.create(dto, req.user.sub);
  }

  @Post('requests/:id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.office.cancel(id, req.user.sub);
  }
}
