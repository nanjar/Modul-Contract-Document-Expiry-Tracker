import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStatus } from '../documents/documents.types';
import { calculateDocumentStatus, expiryWindow } from '../documents/expiry.utils';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const { today, threshold } = expiryWindow();
    const base = { archivedAt: null };
    const [total, active, expiringSoon, expired, noExpiry] = await this.prisma.$transaction([
      this.prisma.document.count({ where: base }),
      this.prisma.document.count({ where: { ...base, expiryDate: { gt: threshold } } }),
      this.prisma.document.count({ where: { ...base, expiryDate: { gte: today, lte: threshold } } }),
      this.prisma.document.count({ where: { ...base, expiryDate: { lt: today } } }),
      this.prisma.document.count({ where: { ...base, expiryDate: null } }),
    ]);
    return { total, active, expiringSoon, expired, noExpiry };
  }

  async expiring(limit = 10) {
    const documents = await this.prisma.document.findMany({ where: { archivedAt: null, expiryDate: { not: null } }, select: { id: true, title: true, documentNumber: true, documentType: true, counterparty: true, expiryDate: true }, orderBy: { expiryDate: 'asc' }, take: Math.min(Math.max(limit, 1), 50) });
    return documents.map((document) => ({ ...document, status: calculateDocumentStatus(document.expiryDate, null) })).filter((document) => document.status === DocumentStatus.EXPIRING_SOON || document.status === DocumentStatus.EXPIRED);
  }

  async recent(limit = 10) {
    const documents = await this.prisma.document.findMany({ where: { archivedAt: null }, select: { id: true, title: true, documentNumber: true, documentType: true, counterparty: true, expiryDate: true }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 50) });
    return documents.map((document) => ({ ...document, status: calculateDocumentStatus(document.expiryDate, null) }));
  }
}
