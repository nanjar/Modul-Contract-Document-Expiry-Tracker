import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStatus } from './documents.types';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const documents = await this.prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
    return documents.map((document) => ({ ...document, status: this.status(document) }));
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id }, include: { reminders: true } });
    if (!document) throw new NotFoundException('Document not found');
    return { ...document, status: this.status(document) };
  }

  async create(input: { title: string; documentType: string; expiryDate?: string | null; createdById: string }) {
    const document = await this.prisma.document.create({
      data: {
        title: input.title,
        documentType: input.documentType,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        createdById: input.createdById,
      },
    });
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
