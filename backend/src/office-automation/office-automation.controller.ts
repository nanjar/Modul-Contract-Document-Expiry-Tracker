import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOfficeApprovalDto } from './dto/create-office-approval.dto';
import { CreateOfficeRequestDto } from './dto/create-office-request.dto';
import { CreateOfficeTaskDto } from './dto/create-office-task.dto';
import { DecideOfficeApprovalDto } from './dto/decide-office-approval.dto';
import { UpdateOfficeRequestDto } from './dto/update-office-request.dto';
import { UpdateOfficeTaskDto } from './dto/update-office-task.dto';
import { OfficeAutomationService } from './office-automation.service';
import { OfficeAutomationQueryService } from './office-automation-query.service';

@ApiTags('office-automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('office-automation')
export class OfficeAutomationController {
  constructor(
    private readonly office: OfficeAutomationService,
    private readonly queries: OfficeAutomationQueryService,
  ) {}

  @Get('dashboard')
  dashboard(@Req() req: any) {
    return this.office.dashboard(req.user.sub);
  }

  @Get('reports')
  reports(@Req() req: any) {
    return this.queries.report(req.user.sub);
  }

  @Get('users')
  users(@Req() req: any) {
    return this.queries.usersForOffice(req.user.sub);
  }

  @Get('requests')
  list(@Req() req: any, @Query('all') all?: string) {
    const isPrivileged = req.user?.role === 'SUPERUSER' || req.user?.role === 'EDITOR';
    const requesterId = isPrivileged && all === 'true' ? undefined : req.user.sub;
    return this.office.list(requesterId, req.user.sub);
  }

  @Get('requests/:id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.office.findOne(id, req.user.sub);
  }

  @Post('requests')
  create(@Body() dto: CreateOfficeRequestDto, @Req() req: any) {
    return this.office.create(dto, req.user.sub);
  }

  @Patch('requests/:id')
  update(@Param('id') id: string, @Body() dto: UpdateOfficeRequestDto, @Req() req: any) {
    return this.office.update(id, dto, req.user.sub);
  }

  @Post('requests/:id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.office.cancel(id, req.user.sub);
  }

  @Get('tasks')
  listTasks(@Req() req: any, @Query('assigneeId') assigneeId?: string, @Query('all') all?: string) {
    const isPrivileged = req.user?.role === 'SUPERUSER' || req.user?.role === 'EDITOR';
    const effectiveAssignee = isPrivileged && all === 'true' ? undefined : assigneeId && req.user?.role === 'SUPERUSER' ? assigneeId : req.user.sub;
    return this.office.listTasks(req.user.sub, effectiveAssignee);
  }

  @Get('approvals')
  listApprovals(@Req() req: any, @Query('all') all?: string) {
    return this.queries.approvals(req.user.sub, all === 'true');
  }

  @Post('requests/:id/tasks')
  createTask(@Param('id') id: string, @Body() dto: CreateOfficeTaskDto, @Req() req: any) {
    return this.office.createTask(id, dto, req.user.sub);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateOfficeTaskDto, @Req() req: any) {
    return this.office.updateTask(id, dto, req.user.sub);
  }

  @Post('requests/:id/approvals')
  createApproval(@Param('id') id: string, @Body() dto: CreateOfficeApprovalDto, @Req() req: any) {
    return this.office.createApproval(id, dto, req.user.sub);
  }

  @Post('approvals/:id/decision')
  decideApproval(@Param('id') id: string, @Body() dto: DecideOfficeApprovalDto, @Req() req: any) {
    return this.office.decideApproval(id, dto, req.user.sub);
  }
}
