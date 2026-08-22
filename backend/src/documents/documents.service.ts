import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DocumentStatus } from './documents.types';

export interface DocumentListQuery {
  search?: string;
  status?: string;
  documentType?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: DocumentListQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + 30);

    const where: any = { archivedAt: null };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { documentType: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { counterparty: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.documentType?.trim()) {
      where.documentType = query.documentType.trim();
    }

    switch (query.status?.trim().toUpperCase()) {
      case DocumentStatus.EXPIRED:
        where.expiryDate = { lt: now };
        break;
      case DocumentStatus.EXPIRING_SOON:
        where.expiryDate = { gte: now, lte: threshold };
        break;
      case DocumentStatus.ACTIVE:
        where.expiryDate = { gt: threshold };
        break;
      case DocumentStatus.NO_EXPIRY:
        where.expiryDate = null;
        break;
      case undefined:
      case '':
        break;
      default:
        throw new BadRequestException('Invalid document status');
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: documents.map((document) => this.toResponse(document)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document || document.archivedAt) {
      throw new NotFoundException('Document not found');
    }
    return this.toResponse(document);
  }

  async create(input: {
    documentNumber?: string;
    title: string;
    documentType: string;
    description?: string;
    counterparty?: string;
    ownerId?: string;
    issueDate?: string | null;
    effectiveDate?: string | null;
    expiryDate?: string | null;
    reminderEnabled?: boolean;
    createdById: string;
  }) {
    if (input.ownerId) {
      await this.assertOwnerExists(input.ownerId);
    }

    const document = await this.prisma.document.create({
      data: {
        documentNumber: input.documentNumber?.trim() || null,
        title: input.title.trim(),
        documentType: input.documentType.trim(),
        description: input.description?.trim() || null,
        counterparty: input.counterparty?.trim() || null,
        ownerId: input.ownerId || null,
        issueDate: input.issueDate ? new Date(input.issueDate) : null,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        reminderEnabled: input.reminderEnabled ?? true,
        createdById: input.createdById,
      },
    });

    await this.audit.log({
      actorId: input.createdById,
      action: 'CREATE',
      entity: 'Document',
      entityId: document.id,
      metadata: {
        title: document.title,
        documentType: document.documentType,
        expiryDate: document.expiryDate,
      },
    });

    return this.toResponse(document);
  }

  async update(
    id: string,
    input: {
      documentNumber?: string;
      title?: string;
      documentType?: string;
      description?: string;
      counterparty?: string;
      ownerId?: string | null;
      issueDate?: string | null;
      effectiveDate?: string | null;
      expiryDate?: string | null;
      reminderEnabled?: boolean;
    },
    actorId: string,
  ) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing || existing.archivedAt) {
      throw new NotFoundException('Document not found');
    }

    if (input.ownerId) {
      await this.assertOwnerExists(input.ownerId);
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.documentNumber !== undefined && { documentNumber: input.documentNumber.trim() || null }),
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.documentType !== undefined && { documentType: input.documentType.trim() }),
        ...(input.description !== undefined && { description: input.description.trim() || null }),
        ...(input.counterparty !== undefined && { counterparty: input.counterparty.trim() || null }),
        ...(input.ownerId !== undefined && { ownerId: input.ownerId }),
        ...(input.issueDate !== undefined && { issueDate: input.issueDate ? new Date(input.issueDate) : null }),
        ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null }),
        ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate ? new Date(input.expiryDate) : null }),
        ...(input.reminderEnabled !== undefined && { reminderEnabled: input.reminderEnabled }),
      },
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'Document',
      entityId: document.id,
      metadata: {
        previous: {
          title: existing.title,
          documentType: existing.documentType,
          expiryDate: existing.expiryDate,
          ownerId: existing.ownerId,
          reminderEnabled: existing.reminderEnabled,
        },
        current: {
          title: document.title,
          documentType: document.documentType,
          expiryDate: document.expiryDate,
          ownerId: document.ownerId,
          reminderEnabled: document.reminderEnabled,
        },
      },
    });

    return this.toResponse(document);
  }

  async archive(id: string, actorId: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing || existing.archivedAt) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: { archivedAt: new Date(), archivedById: actorId },
    });

    await this.audit.log({
      actorId,
      action: 'ARCHIVE',
      entity: 'Document',
      entityId: document.id,
      metadata: { title: document.title },
    });

    return this.toResponse(document);
  }

  private async assertOwnerExists(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, isActive: true },
    });

    if (!owner || !owner.isActive) {
      throw new BadRequestException('Document owner is not an active user');
    }
  }

  private toResponse(document: {
    id: string;
    documentNumber?: string | null;
    title: string;
    documentType: string;
    description?: string | null;
    counterparty?: string | null;
    ownerId?: string | null;
    issueDate?: Date | null;
    effectiveDate?: Date | null;
    expiryDate: Date | null;
    reminderEnabled?: boolean;
    storageKey?: string | null;
    originalFilename?: string | null;
    mimeType?: string | null;
    fileSize?: bigint | number | null;
    createdById: string;
    createdAt?: Date;
    updatedAt?: Date;
    archivedAt: Date | null;
    archivedById?: string | null;
  }) {
    return {
      ...document,
      fileSize: typeof document.fileSize === 'bigint' ? document.fileSize.toString() : document.fileSize,
      status: this.status(document),
    };
  }

  private status(document: { expiryDate: Date | null; archivedAt: Date | null }): DocumentStatus {
    if (document.archivedAt) return DocumentStatus.ARCHIVED;
    if (!document.expiryDate) return DocumentStatus.NO_EXPIRY;

    const now = new Date();
    const expiry = new Date(document.expiryDate);
    if (expiry < now) return DocumentStatus.EXPIRED;

    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + 30);
    if (expiry <= threshold) return DocumentStatus.EXPIRING_SOON;

    return DocumentStatus.ACTIVE;
  }
}
