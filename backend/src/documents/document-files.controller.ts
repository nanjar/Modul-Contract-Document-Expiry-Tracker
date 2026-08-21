import { BadRequestException, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@ApiTags('document-files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentFilesController {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  @Post(':id/file')
  @Roles(Role.SUPERUSER, Role.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: { user: { sub: string } }) {
    if (!file) throw new BadRequestException('File is required');
    const max = Number(process.env.MAX_FILE_SIZE_BYTES ?? 10485760);
    if (file.size > max) throw new BadRequestException('File exceeds the maximum allowed size');
    const allowed = (process.env.ALLOWED_MIME_TYPES ?? 'application/pdf,image/png,image/jpeg').split(',').map((v) => v.trim());
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Unsupported file type');
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.archivedAt) throw new BadRequestException('Document not found or archived');
    return this.storage.upload(id, req.user.sub, file);
  }
  @Get(':id/file')
  async download(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc?.storageKey) throw new BadRequestException('Document file not found');
    const object = await this.storage.getObject(doc.storageKey);
    if (object.ContentType) res.type(object.ContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${(doc.originalFilename ?? 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
    (object.Body as any).pipe(res);
  }
}
