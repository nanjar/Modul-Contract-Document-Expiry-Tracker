import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';

const OFFICE = ModuleKey.OFFICE_AUTOMATION;
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

@Injectable()
export class OfficeAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
  ) {}

  async upload(requestId: string, actorId: string, file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
    await this.users.assertModuleAccess(actorId, OFFICE, 'OFFICE_REQUEST_VIEW');
    if (!file?.buffer || !file.originalname || !file.mimetype) throw new BadRequestException('Invalid uploaded file');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException('File exceeds maximum size of 20 MB');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);

    const request = await this.prisma.officeRequest.findUnique({ where: { id: requestId }, select: { id: true, requesterId: true } });
    if (!request) throw new NotFoundException('Office request not found');

    const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    const isPrivileged = user?.role === 'SUPERUSER' || user?.role === 'EDITOR';
    if (!isPrivileged && request.requesterId !== actorId) throw new ForbiddenException('You can only attach files to your own requests');

    const extension = EXTENSION_BY_MIME[file.mimetype];
    const key = `office-requests/${requestId}/${crypto.randomUUID()}${extension}`;
    await this.storage.putObject({ key, body: file.buffer, contentType: file.mimetype });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.officeRequestAttachment.create({
          data: { requestId, uploadedById: actorId, storageKey: key, originalFilename: file.originalname, mimeType: file.mimetype, fileSize: file.size },
        });
        await tx.officeActivityLog.create({
          data: { requestId, actorId, action: 'REQUEST_ATTACHMENT_UPLOADED', metadata: { attachmentId: attachment.id, filename: file.originalname } },
        });
        return attachment;
      });
    } catch (error) {
      try { await this.storage.deleteObject(key); } catch { /* best effort */ }
      throw error;
    }
  }

  async list(requestId: string, actorId: string) {
    await this.users.assertModuleAccess(actorId, OFFICE, 'OFFICE_REQUEST_VIEW');
    const request = await this.prisma.officeRequest.findUnique({ where: { id: requestId }, select: { id: true, requesterId: true } });
    if (!request) throw new NotFoundException('Office request not found');
    await this.assertCanView(request.requesterId, actorId);

    return this.prisma.officeRequestAttachment.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, originalFilename: true, mimeType: true, fileSize: true, createdAt: true, uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async download(id: string, actorId: string) {
    await this.users.assertModuleAccess(actorId, OFFICE, 'OFFICE_REQUEST_VIEW');
    const attachment = await this.prisma.officeRequestAttachment.findUnique({ where: { id }, include: { request: { select: { requesterId: true } } } });
    if (!attachment) throw new NotFoundException('Office request attachment not found');
    await this.assertCanView(attachment.request.requesterId, actorId);

    return { url: await this.storage.getDownloadUrl(attachment.storageKey), expiresIn: 300, filename: attachment.originalFilename, mimeType: attachment.mimeType };
  }

  private async assertCanView(requesterId: string, actorId: string) {
    if (requesterId === actorId) return;
    const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (user?.role === 'SUPERUSER' || user?.role === 'EDITOR') return;
    throw new ForbiddenException('You can only access your own request attachments');
  }
}
