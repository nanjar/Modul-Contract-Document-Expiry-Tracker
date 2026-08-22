import {
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
    const limit = Math.min(
      100,
      Math.max(1, Number(query.limit) || 20),
    );
    const skip = (page - 1) * limit;

    const where: any = {
      archivedAt: null,
    };

    if (query.search?.trim()) {
      const search = query.search.trim();

      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          documentNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          documentType: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          counterparty: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query.documentType?.trim()) {
      where.documentType = query.documentType.trim();
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: [
          {
            expiryDate: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip,
        take: limit,
      }),
      this.prisma.document.count({
        where,
      }),
    ]);

    let items = documents.map((document) =>
      this.toResponse(document),
    );

    if (query.status?.trim()) {
      const status = query.status.trim().toUpperCase();

      items = items.filter(
        (document) => document.status === status,
      );
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total: query.status?.trim()
          ? items.length
          : total,
        totalPages: query.status?.trim()
          ? Math.ceil(items.length / limit)
          : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.archivedAt) {
      throw new NotFoundException('Document not found');
    }

    return this.toResponse(document);
  }

  async create(input: {
    title: string;
    documentType: string;
    expiryDate?: string | null;
    createdById: string;
  }) {
    const document = await this.prisma.document.create({
      data: {
        title: input.title,
        documentType: input.documentType,
        expiryDate: input.expiryDate
          ? new Date(input.expiryDate)
          : null,
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
      title?: string;
      documentType?: string;
      expiryDate?: string | null;
    },
    actorId: string,
  ) {
    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing || existing.archivedAt) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.title !== undefined && {
          title: input.title,
        }),

        ...(input.documentType !== undefined && {
          documentType: input.documentType,
        }),

        ...(input.expiryDate !== undefined && {
          expiryDate: input.expiryDate
            ? new Date(input.expiryDate)
            : null,
        }),
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
        },
        current: {
          title: document.title,
          documentType: document.documentType,
          expiryDate: document.expiryDate,
        },
      },
    });

    return this.toResponse(document);
  }

  async archive(
    id: string,
    actorId: string,
  ) {
    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing || existing.archivedAt) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedById: actorId,
      },
    });

    await this.audit.log({
      actorId,
      action: 'ARCHIVE',
      entity: 'Document',
      entityId: document.id,
      metadata: {
        title: document.title,
      },
    });

    return this.toResponse(document);
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
      fileSize:
        typeof document.fileSize === 'bigint'
          ? document.fileSize.toString()
          : document.fileSize,
      status: this.status(document),
    };
  }

  private status(document: {
    expiryDate: Date | null;
    archivedAt: Date | null;
  }): DocumentStatus {
    if (document.archivedAt) {
      return DocumentStatus.ARCHIVED;
    }

    if (!document.expiryDate) {
      return DocumentStatus.NO_EXPIRY;
    }

    const now = new Date();
    const expiry = new Date(document.expiryDate);

    if (expiry < now) {
      return DocumentStatus.EXPIRED;
    }

    const threshold = new Date(now);
    threshold.setDate(
      threshold.getDate() + 30,
    );

    if (expiry <= threshold) {
      return DocumentStatus.EXPIRING_SOON;
    }

    return DocumentStatus.ACTIVE;
  }
}
