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
import { ListDocumentsDto } from './dto/list-documents.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

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
  create(
    @Body() dto: CreateDocumentDto,
    @Req() req: any,
  ) {
    return this.documents.create({
      ...dto,
      createdById: req.user.sub,
    });
  }

  @Patch(':id')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.documents.update(
      id,
      dto,
      req.user.sub,
    );
  }

  @Post(':id/archive')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  archive(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.documents.archive(
      id,
      req.user.sub,
    );
  }
}
