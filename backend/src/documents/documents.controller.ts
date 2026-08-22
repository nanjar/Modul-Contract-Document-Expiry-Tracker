import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { RemindersService } from '../reminders/reminders.service';
import { StorageService } from '../storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly reminders: RemindersService,
    private readonly storage: StorageService,
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
  create(@Body() dto: CreateDocumentDto, @Req() req: any) {
    return this.documents.create({ ...dto, createdById: req.user.sub });
  }

  @Patch(':id')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: any) {
    return this.documents.update(id, dto, req.user.sub);
  }

  @Post(':id/archive')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  archive(@Param('id') id: string, @Req() req: any) {
    return this.documents.archive(id, req.user.sub);
  }

  @Post(':id/file')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!file.originalname || !file.mimetype || !file.buffer) {
      throw new BadRequestException('Invalid uploaded file');
    }

    const expectedExtension = EXTENSION_BY_MIME[file.mimetype];
    if (!expectedExtension) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const document = await this.documents.findOne(id);
    const key = `documents/${id}/${crypto.randomUUID()}${expectedExtension}`;

    await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    await this.documents.attachFile(id, {
      storageKey: key,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    }, req.user.sub);

    if (document.storageKey && document.storageKey !== key) {
      await this.storage.deleteObject(document.storageKey);
    }

    return this.documents.findOne(id);
  }

  @Get(':id/file')
  @Roles(Role.SUPERUSER, Role.EDITOR, Role.VIEWER)
  async downloadFile(@Param('id') id: string) {
    const document = await this.documents.findOne(id);
    if (!document.storageKey) throw new BadRequestException('Document has no file');

    return {
      url: await this.storage.getDownloadUrl(document.storageKey),
      expiresIn: 300,
      filename: document.originalFilename,
      mimeType: document.mimeType,
    };
  }
}
