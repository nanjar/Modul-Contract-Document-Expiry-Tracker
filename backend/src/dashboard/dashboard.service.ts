import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { DocumentStatus } from '../documents/documents.types';
import { calculateConfigurableDocumentStatus, configurableExpiryWindow } from '../documents/configurable-expiry.utils';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  async summary() {
    const warningDays = await this.settings.getWarningThresholdDays();
    const { today, threshold } = configurableExpiryWindow(new Date(), warningDays);
    const base = { archivedAt: null };
    const [total, active, expiringSoon, expired, noExpiry] = await this.prisma.$transaction([
      this.prisma.document.count({ where: base }),
      this.prisma.document.count({ where: { ...base, expiryDate: { gt: threshold } } }),
      this.prisma.document.count({ where: { ...base, expiryDate: { gte: today, lte: threshold } } }),
      this.prisma.document.count({ where: { ...base, expiryDate: { lt: today } } }),
      this.prisma.document.count({ where: { ...base, expiryDate: null } }),
    ]);
    return { total, active, expiringSoon, expired, noExpiry, warningThresholdDays: warningDays };
  }

  async expiring(limit = 10) {
    const warningDays = await this.settings.getWarningThresholdDays();
    const documents = await this.prisma.document.findMany({ where: { archivedAt: null, expiryDate: { not: null } }, select: { id: true, title: true, documentNumber: true, documentType: true, counterparty: true, expiryDate: true }, orderBy: { expiryDate: 'asc' }, take: Math.min(Math.max(limit, 1), 50) });
    return documents.map((document) => ({ ...document, status: calculateConfigurableDocumentStatus(document.expiryDate, null, new Date(), warningDays) })).filter((document) => document.status === DocumentStatus.EXPIRING_SOON || document.status === DocumentStatus.EXPIRED);
  }

  async recent(limit = 10) {
    const warningDays = await this.settings.getWarningThresholdDays();
    const documents = await this.prisma.document.findMany({ where: { archivedAt: null }, select: { id: true, title: true, documentNumber: true, documentType: true, counterparty: true, expiryDate: true }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 50) });
    return documents.map((document) => ({ ...document, status: calculateConfigurableDocumentStatus(document.expiryDate, null, new Date(), warningDays) }));
  }
}
