import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  Roles,
  RolesGuard,
} from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
  ) {}

  @Get('summary')
  @Roles(
    Role.SUPERUSER,
    Role.EDITOR,
    Role.VIEWER,
  )
  summary() {
    return this.dashboard.summary();
  }

  @Get('expiring')
  @Roles(
    Role.SUPERUSER,
    Role.EDITOR,
    Role.VIEWER,
  )
  expiring(
    @Query('limit') limit?: string,
  ) {
    return this.dashboard.expiring(
      Number(limit) || 10,
    );
  }

  @Get('recent')
  @Roles(
    Role.SUPERUSER,
    Role.EDITOR,
    Role.VIEWER,
  )
  recent(
    @Query('limit') limit?: string,
  ) {
    return this.dashboard.recent(
      Number(limit) || 10,
    );
  }
}
