import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
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
import { OfficeAttachmentService } from './office-attachment.service';
import { OfficeAutomationQueryService } from './office-automation-query.service';
import { OfficeAutomationService } from './office-automation.service';
import { OfficeRequestRulesService } from './office-request-rules.service';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv','image/jpeg','image/png']);

@ApiTags('office-automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@ModuleAccess(ModuleKey.OFFICE_AUTOMATION)
@Controller(['office-automation', 'office'])
export class OfficeAutomationController {
  constructor(private readonly office: OfficeAutomationService, private readonly queries: OfficeAutomationQueryService, private readonly attachments: OfficeAttachmentService, private readonly requestRules: OfficeRequestRulesService) {}
  @Get('dashboard') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_DASHBOARD_VIEW') dashboard(@Req() req:any){return this.office.dashboard(req.user.sub);}
  @Get('reports') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REPORT_VIEW') reports(@Req() req:any){return this.queries.report(req.user.sub);}
  @Get('users') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_TASK_ASSIGN') users(@Req() req:any){return this.queries.usersForOffice(req.user.sub);}
  @Get('requests') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_VIEW') list(@Req() req:any,@Query('all') all?:string){const p=req.user?.role==='SUPERUSER'||req.user?.role==='EDITOR';return this.office.list(p&&all==='true'?undefined:req.user.sub,req.user.sub);}
  @Get('requests/:id') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_VIEW') findOne(@Param('id') id:string,@Req() req:any){return this.office.findOne(id,req.user.sub);}
  @Post('requests') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_CREATE') async create(@Body() dto:CreateOfficeRequestDto,@Req() req:any){await this.requestRules.validate(dto.type,dto.metadata,{startDate:dto.startDate,endDate:dto.endDate},req.user.sub);return this.office.create(dto,req.user.sub);}
  @Patch('requests/:id') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_EDIT') update(@Param('id') id:string,@Body() dto:UpdateOfficeRequestDto,@Req() req:any){return this.office.update(id,dto,req.user.sub);}
  @Post('requests/:id/cancel') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_EDIT') cancel(@Param('id') id:string,@Req() req:any){return this.office.cancel(id,req.user.sub);}
  @Get('tasks') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_TASK_VIEW') listTasks(@Req() req:any,@Query('assigneeId') assigneeId?:string,@Query('all') all?:string){const p=req.user?.role==='SUPERUSER'||req.user?.role==='EDITOR';const a=p&&all==='true'?undefined:assigneeId&&req.user?.role==='SUPERUSER'?assigneeId:req.user.sub;return this.office.listTasks(req.user.sub,a);}
  @Get('tasks/:id') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_TASK_VIEW') task(@Param('id') id:string,@Req() req:any){return this.queries.task(id,req.user.sub);}
  @Get('approvals') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_APPROVAL_VIEW') listApprovals(@Req() req:any,@Query('all') all?:string){return this.queries.approvals(req.user.sub,all==='true');}
  @Post('requests/:id/tasks') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_TASK_ASSIGN') createTask(@Param('id') id:string,@Body() dto:CreateOfficeTaskDto,@Req() req:any){return this.office.createTask(id,dto,req.user.sub);}
  @Patch('tasks/:id') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_TASK_UPDATE') updateTask(@Param('id') id:string,@Body() dto:UpdateOfficeTaskDto,@Req() req:any){return this.office.updateTask(id,dto,req.user.sub);}
  @Post('requests/:id/approvals') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_APPROVAL_ACTION') createApproval(@Param('id') id:string,@Body() dto:CreateOfficeApprovalDto,@Req() req:any){return this.office.createApproval(id,dto,req.user.sub);}
  @Post('approvals/:id/decision') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_APPROVAL_ACTION') decideApproval(@Param('id') id:string,@Body() dto:DecideOfficeApprovalDto,@Req() req:any){return this.office.decideApproval(id,dto,req.user.sub);}
  @Post('approvals/:id/approve') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_APPROVAL_ACTION') approve(@Param('id') id:string,@Req() req:any){return this.office.decideApproval(id,{status:'APPROVED'},req.user.sub);}
  @Post('approvals/:id/reject') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_APPROVAL_ACTION') reject(@Param('id') id:string,@Body() body:{comment?:string},@Req() req:any){return this.office.decideApproval(id,{status:'REJECTED',comment:body?.comment},req.user.sub);}
  @Get('requests/:id/attachments') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_VIEW') listAttachments(@Param('id') id:string,@Req() req:any){return this.attachments.list(id,req.user.sub);}
  @Post('requests/:id/attachments') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_EDIT') @ApiConsumes('multipart/form-data') @ApiBody({schema:{type:'object',properties:{file:{type:'string',format:'binary'}},required:['file']}}) @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_UPLOAD_BYTES},fileFilter:(_req,file,callback)=>{if(!ALLOWED_MIME_TYPES.has(file.mimetype)){callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`),false);return;}callback(null,true);}})) async uploadAttachment(@Param('id') id:string,@UploadedFile() file:any,@Req() req:any){if(!file)throw new BadRequestException('File is required');return this.attachments.upload(id,req.user.sub,file);}
  @Get('attachments/:id') @ModuleAccess(ModuleKey.OFFICE_AUTOMATION,'OFFICE_REQUEST_VIEW') downloadAttachment(@Param('id') id:string,@Req() req:any){return this.attachments.download(id,req.user.sub);}
}
