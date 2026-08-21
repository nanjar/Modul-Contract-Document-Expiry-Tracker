import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStatus } from './documents.types';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const documents = await this.prisma.document.findMany({ orderBy: { createdAt: 'desc' }, include: { owner: { select: { id: true, name: true, email: true } } } });
    return documents.map((document) => ({ ...document, status: this.status(document) }));
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id }, include: { reminders: true, owner: { select: { id: true, name: true, email: true } } } });
    if (!document) throw new NotFoundException('Document not found');
    return { ...document, status: this.status(document) };
  }

  async create(input: { title: string; documentType: string; expiryDate?: string | null; createdById: string }) {
    const document = await this.prisma.document.create({ data: { title: input.title, documentType: input.documentType, expiryDate: input.expiryDate ? new Date(input.expiryDate) : null, createdById: input.createdById } });
    await this.prisma.auditLog.create({ data: { actorId: input.createdById, action: 'DOCUMENT_CREATED', entity: 'Document', entityId: document.id, metadata: { source: 'web' } } });
    return { ...document, status: this.status(document) };
  }

  async update(id: string, input: Partial<{ title: string; documentType: string; expiryDate: string | null; reminderEnabled: boolean }>, actorId: string) {
    const before = await this.prisma.document.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Document not found');
    const document = await this.prisma.document.update({ where: { id }, data: { title: input.title, documentType: input.documentType, expiryDate: input.expiryDate === null ? null : input.expiryDate ? new Date(input.expiryDate) : undefined, reminderEnabled: input.reminderEnabled } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'DOCUMENT_UPDATED', entity: 'Document', entityId: id, metadata: { before: { title: before.title, documentType: before.documentType, expiryDate: before.expiryDate }, after: { title: document.title, documentType: document.documentType, expiryDate: document.expiryDate }, source: 'web' } } });
    return { ...document, status: this.status(document) };
  }

  async archive(id: string, actorId: string) {
    const document = await this.prisma.document.update({ where: { id }, data: { archivedAt: new Date(), archivedById: actorId } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'DOCUMENT_ARCHIVED', entity: 'Document', entityId: id, metadata: { source: 'web' } } });
    return { ...document, status: this.status(document) };
  }

  status(document: { expiryDate: Date | null; archivedAt: Date | null }, warningDays = 30): DocumentStatus {
    if (document.archivedAt) return DocumentStatus.ARCHIVED;
    if (!document.expiryDate) return DocumentStatus.NO_EXPIRY;
    const today = new Date();
    const expiry = document.expiryDate;
    if (expiry < today) return DocumentStatus.EXPIRED;
    const threshold = new Date(today);
    threshold.setDate(threshold.getDate() + warningDays);
    if (expiry <= threshold) return DocumentStatus.EXPIRING_SOON;
    return DocumentStatus.ACTIVE;
  }
}
