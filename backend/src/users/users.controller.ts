import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERUSER)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list() { return this.users.list(); }
  @Post() create(@Body() body: { email: string; name: string; password: string; role?: Role }) { return this.users.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: { name?: string; role?: Role; isActive?: boolean }) { return this.users.update(id, body); }
}
