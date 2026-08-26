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
import { ModuleKey } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccess } from '../auth/module-access.decorator';
import { ModuleAccessGuard } from '../auth/module-access.guard';
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
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@ModuleAccess(ModuleKey.OFFICE_AUTOMATION)
@Controller('office-automation')
export class OfficeAutomationController {
  constructor(
    private readonly office: OfficeAutomationService,
    private readonly queries: OfficeAutomationQueryService,
  ) {}

  @Get('dashboard')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_DASHBOARD_VIEW')
  dashboard(@Req() req: any) {
    return this.office.dashboard(req.user.sub);
  }

  @Get('reports')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REPORT_VIEW')
  reports(@Req() req: any) {
    return this.queries.report(req.user.sub);
  }

  @Get('users')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_TASK_ASSIGN')
  users(@Req() req: any) {
    return this.queries.usersForOffice(req.user.sub);
  }

  @Get('requests')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  list(@Req() req: any, @Query('all') all?: string) {
    const isPrivileged = req.user?.role === 'SUPERUSER' || req.user?.role === 'EDITOR';
    const requesterId = isPrivileged && all === 'true' ? undefined : req.user.sub;
    return this.office.list(requesterId, req.user.sub);
  }

  @Get('requests/:id')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_VIEW')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.office.findOne(id, req.user.sub);
  }

  @Post('requests')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_CREATE')
  create(@Body() dto: CreateOfficeRequestDto, @Req() req: any) {
    return this.office.create(dto, req.user.sub);
  }

  @Patch('requests/:id')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_EDIT')
  update(@Param('id') id: string, @Body() dto: UpdateOfficeRequestDto, @Req() req: any) {
    return this.office.update(id, dto, req.user.sub);
  }

  @Post('requests/:id/cancel')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_REQUEST_EDIT')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.office.cancel(id, req.user.sub);
  }

  @Get('tasks')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_TASK_VIEW')
  listTasks(@Req() req: any, @Query('assigneeId') assigneeId?: string, @Query('all') all?: string) {
    const isPrivileged = req.user?.role === 'SUPERUSER' || req.user?.role === 'EDITOR';
    const effectiveAssignee = isPrivileged && all === 'true' ? undefined : assigneeId && req.user?.role === 'SUPERUSER' ? assigneeId : req.user.sub;
    return this.office.listTasks(req.user.sub, effectiveAssignee);
  }

  @Get('tasks/:id')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_TASK_VIEW')
  task(@Param('id') id: string, @Req() req: any) {
    return this.queries.task(id, req.user.sub);
  }

  @Get('approvals')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_APPROVAL_VIEW')
  listApprovals(@Req() req: any, @Query('all') all?: string) {
    return this.queries.approvals(req.user.sub, all === 'true');
  }

  @Post('requests/:id/tasks')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_TASK_ASSIGN')
  createTask(@Param('id') id: string, @Body() dto: CreateOfficeTaskDto, @Req() req: any) {
    return this.office.createTask(id, dto, req.user.sub);
  }

  @Patch('tasks/:id')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_TASK_UPDATE')
  updateTask(@Param('id') id: string, @Body() dto: UpdateOfficeTaskDto, @Req() req: any) {
    return this.office.updateTask(id, dto, req.user.sub);
  }

  @Post('requests/:id/approvals')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_APPROVAL_ACTION')
  createApproval(@Param('id') id: string, @Body() dto: CreateOfficeApprovalDto, @Req() req: any) {
    return this.office.createApproval(id, dto, req.user.sub);
  }

  @Post('approvals/:id/decision')
  @ModuleAccess(ModuleKey.OFFICE_AUTOMATION, 'OFFICE_APPROVAL_ACTION')
  decideApproval(@Param('id') id: string, @Body() dto: DecideOfficeApprovalDto, @Req() req: any) {
    return this.office.decideApproval(id, dto, req.user.sub);
  }
}
