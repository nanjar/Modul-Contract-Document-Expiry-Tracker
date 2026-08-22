import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RemindersService } from '../reminders/reminders.service';
import { DocumentStatus } from './documents.types';
import { calculateDocumentStatus } from './expiry.utils';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly reminders: RemindersService) {}

  async list(query?: { search?: string; status?: string; documentType?: string; expiryFrom?: string; expiryTo?: string; sort?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page ?? 1); const limit = Math.min(100, Math.max(1, query?.limit ?? 20)); const skip = (page - 1) * limit;
    const now = new Date(); const threshold = new Date(now); threshold.setDate(threshold.getDate() + 30); const status = query?.status?.trim() as DocumentStatus | undefined;
    const where: any = status === DocumentStatus.ARCHIVED ? { archivedAt: { not: null } } : { archivedAt: null };
    if (query?.search?.trim()) { const search = query.search.trim(); where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { documentNumber: { contains: search, mode: 'insensitive' } }, { counterparty: { contains: search, mode: 'insensitive' } }]; }
    if (query?.documentType?.trim()) where.documentType = query.documentType.trim();
    if (query?.expiryFrom || query?.expiryTo) { where.expiryDate = {}; if (query.expiryFrom) where.expiryDate.gte = new Date(query.expiryFrom); if (query.expiryTo) where.expiryDate.lte = new Date(query.expiryTo); }
    if (status === DocumentStatus.NO_EXPIRY) where.expiryDate = null;
    if (status === DocumentStatus.EXPIRED) where.expiryDate = { ...(where.expiryDate ?? {}), lt: now };
    if (status === DocumentStatus.EXPIRING_SOON) where.expiryDate = { ...(where.expiryDate ?? {}), gte: now, lte: threshold };
    if (status === DocumentStatus.ACTIVE) where.expiryDate = { ...(where.expiryDate ?? {}), gt: threshold };
    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({ where, orderBy: this.getOrderBy(query?.sort), skip, take: limit }),
      this.prisma.document.count({ where }),
    ]);
    return { items: documents.map((document) => this.toResponse(document)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) { const document = await this.prisma.document.findUnique({ where: { id } }); if (!document || document.archivedAt) throw new NotFoundException('Document not found'); return this.toResponse(document); }

  async create(input: any) {
    if (input.ownerId) await this.assertOwnerExists(input.ownerId);
    const document = await this.prisma.document.create({ data: { documentNumber: input.documentNumber?.trim() || null, title: input.title.trim(), documentType: input.documentType.trim(), description: input.description?.trim() || null, counterparty: input.counterparty?.trim() || null, ownerId: input.ownerId || null, issueDate: input.issueDate ? new Date(input.issueDate) : null, effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null, expiryDate: input.expiryDate ? new Date(input.expiryDate) : null, reminderEnabled: input.reminderEnabled ?? true, createdById: input.createdById } });
    await this.audit.log({ actorId: input.createdById, action: 'CREATE', entity: 'Document', entityId: document.id, metadata: { title: document.title, documentType: document.documentType, expiryDate: document.expiryDate } }); await this.reminders.createDefaults(document.id); return this.toResponse(document);
  }

  async update(id: string, input: any, actorId: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } }); if (!existing || existing.archivedAt) throw new NotFoundException('Document not found'); if (input.ownerId) await this.assertOwnerExists(input.ownerId);
    const document = await this.prisma.document.update({ where: { id }, data: { ...(input.documentNumber !== undefined && { documentNumber: input.documentNumber.trim() || null }), ...(input.title !== undefined && { title: input.title.trim() }), ...(input.documentType !== undefined && { documentType: input.documentType.trim() }), ...(input.description !== undefined && { description: input.description.trim() || null }), ...(input.counterparty !== undefined && { counterparty: input.counterparty.trim() || null }), ...(input.ownerId !== undefined && { ownerId: input.ownerId }), ...(input.issueDate !== undefined && { issueDate: input.issueDate ? new Date(input.issueDate) : null }), ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null }), ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate ? new Date(input.expiryDate) : null }), ...(input.reminderEnabled !== undefined && { reminderEnabled: input.reminderEnabled }) } });
    await this.audit.log({ actorId, action: 'UPDATE', entity: 'Document', entityId: document.id, metadata: { previous: { title: existing.title, documentType: existing.documentType, expiryDate: existing.expiryDate, ownerId: existing.ownerId, reminderEnabled: existing.reminderEnabled }, current: { title: document.title, documentType: document.documentType, expiryDate: document.expiryDate, ownerId: document.ownerId, reminderEnabled: document.reminderEnabled } } });

    const expiryChanged =
      (existing.expiryDate?.getTime() ?? null) !== (document.expiryDate?.getTime() ?? null);
    const reminderSettingChanged = existing.reminderEnabled !== document.reminderEnabled;

    if (expiryChanged || reminderSettingChanged) {
      await this.reminders.resetDeliveryState(document.id, document.reminderEnabled);
    }

    if (document.expiryDate && document.reminderEnabled && (expiryChanged || !existing.expiryDate || !existing.reminderEnabled)) {
      await this.reminders.createDefaults(document.id);
    }

    return this.toResponse(document);
  }

  async attachFile(id: string, file: { storageKey: string; originalFilename: string; mimeType: string; fileSize: number }, actorId: string) { const existing = await this.prisma.document.findUnique({ where: { id } }); if (!existing || existing.archivedAt) throw new NotFoundException('Document not found'); const document = await this.prisma.document.update({ where: { id }, data: file }); await this.audit.log({ actorId, action: 'UPLOAD_FILE', entity: 'Document', entityId: id, metadata: { originalFilename: file.originalFilename, mimeType: file.mimeType, fileSize: file.fileSize } }); return this.toResponse(document); }
  async archive(id: string, actorId: string) { const existing = await this.prisma.document.findUnique({ where: { id } }); if (!existing || existing.archivedAt) throw new NotFoundException('Document not found'); const document = await this.prisma.document.update({ where: { id }, data: { archivedAt: new Date(), archivedById: actorId } }); await this.audit.log({ actorId, action: 'ARCHIVE', entity: 'Document', entityId: document.id, metadata: { title: document.title } }); return this.toResponse(document); }

  private getOrderBy(sort?: string) { switch (sort) { case 'created_asc': return { createdAt: 'asc' as const }; case 'expiry_asc': return [{ expiryDate: { sort: 'asc' as const, nulls: 'last' as const } }, { createdAt: 'desc' as const }]; case 'expiry_desc': return [{ expiryDate: { sort: 'desc' as const, nulls: 'last' as const } }, { createdAt: 'desc' as const }]; case 'title_asc': return { title: 'asc' as const }; default: return { createdAt: 'desc' as const }; } }
  private async assertOwnerExists(ownerId: string) { const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, isActive: true } }); if (!owner || !owner.isActive) throw new BadRequestException('Document owner is not an active user'); }
  private toResponse(document: any) { return { ...document, fileSize: typeof document.fileSize === 'bigint' ? document.fileSize.toString() : document.fileSize, status: this.status(document) }; }
  private status(document: { expiryDate: Date | null; archivedAt: Date | null }) { return calculateDocumentStatus(document.expiryDate, document.archivedAt); }
}
