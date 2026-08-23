import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateModuleAccessDto } from './dto/update-module-access.dto';
import { UpdateTelegramIdentityDto } from './dto/update-telegram-identity.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TelegramIdentityService } from './telegram-identity.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
@Roles(Role.SUPERUSER)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly telegram: TelegramIdentityService,
  ) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Get(':id/modules')
  getModuleAccess(@Param('id') id: string) {
    return this.users.getModuleAccess(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.users.create({ ...dto, actorId: req.user.sub });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.users.update(id, dto, req.user.sub);
  }

  @Patch(':id/modules')
  updateModuleAccess(
    @Param('id') id: string,
    @Body() dto: UpdateModuleAccessDto,
    @Req() req: any,
  ) {
    return this.users.updateModuleAccess(id, dto, req.user.sub);
  }

  @Patch(':id/telegram')
  updateTelegram(
    @Param('id') id: string,
    @Body() dto: UpdateTelegramIdentityDto,
    @Req() req: any,
  ) {
    return this.telegram.set(id, dto.chatId, dto.username, req.user.sub);
  }

  @Delete(':id/telegram')
  removeTelegram(@Param('id') id: string, @Req() req: any) {
    return this.telegram.remove(id, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.users.remove(id, req.user.sub);
  }
}
