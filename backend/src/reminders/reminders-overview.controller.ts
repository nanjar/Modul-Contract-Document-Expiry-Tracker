import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ModuleKey, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccess } from '../auth/module-access.decorator';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller('reminders')
export class RemindersOverviewController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.EDITOR, Role.VIEWER)
  @ModuleAccess(ModuleKey.CONTRACT_DOCUMENT, 'DOCUMENT_VIEW')
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@Query('enabled') enabled?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reminders.listAll({
      enabled: enabled === undefined ? undefined : enabled === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
