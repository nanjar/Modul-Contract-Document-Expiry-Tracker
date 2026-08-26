import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.employees.me(req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERUSER)
  list() {
    return this.employees.list();
  }

  @Get(':id')
  @Roles(Role.SUPERUSER)
  findOne(@Param('id') id: string) {
    return this.employees.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERUSER)
  create(@Body() dto: CreateEmployeeDto, @Req() req: any) {
    return this.employees.create({ ...dto, actorId: req.user.sub });
  }

  @Patch(':id')
  @Roles(Role.SUPERUSER)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() req: any) {
    return this.employees.update(id, dto, req.user.sub);
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPERUSER)
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.employees.deactivate(id, req.user.sub);
  }
}
