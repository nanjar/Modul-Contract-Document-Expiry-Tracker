import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
@Roles(Role.SUPERUSER)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.audit.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.audit.findOne(id);
  }
}
