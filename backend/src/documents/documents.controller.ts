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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { RemindersService } from '../reminders/reminders.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly reminders: RemindersService,
  ) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.EDITOR, Role.VIEWER)
  list(@Query() query: ListDocumentsQueryDto) {
    return this.documents.list(query);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.EDITOR, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.EDITOR)
  async create(@Body() dto: CreateDocumentDto, @Req() req: any) {
    const document = await this.documents.create({
      ...dto,
      createdById: req.user.sub,
    });

    await this.reminders.createDefaults(document.id);
    return document;
  }

  @Patch(':id')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    const document = await this.documents.update(id, dto, req.user.sub);
    await this.reminders.createDefaults(document.id);
    return document;
  }

  @Post(':id/archive')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  archive(@Param('id') id: string, @Req() req: any) {
    return this.documents.archive(id, req.user.sub);
  }
}
