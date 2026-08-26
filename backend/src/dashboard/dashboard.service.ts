import { Injectable } from '@nestjs/common';
import { ModuleKey, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { DocumentStatus } from '../documents/documents.types';
import { calculateConfigurableDocumentStatus, configurableExpiryWindow } from '../documents/configurable-expiry.utils';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  private async canViewDocuments(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        moduleAccess: {
          where: { module: ModuleKey.CONTRACT_DOCUMENT },
          select: { permissions: true },
        },
      },
    });
    if (!user?.isActive) return false;
    if (user.role === Role.SUPERUSER) return true;
    return user.moduleAccess[0]?.permissions.includes('DOCUMENT_VIEW') ?? false;
  }

  async summary(userId: string) {
    if (!(await this.canViewDocuments(userId))) {
      return { total: 0, active: 0, expiringSoon: 0, expired: 0, noExpiry: 0, warningThresholdDays: 0 };
    }
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

  async expiring(userId: string, limit = 10) {
    if (!(await this.canViewDocuments(userId))) return [];
    const warningDays = await this.settings.getWarningThresholdDays();
    const documents = await this.prisma.document.findMany({ where: { archivedAt: null, expiryDate: { not: null } }, select: { id: true, title: true, documentNumber: true, documentType: true, counterparty: true, expiryDate: true }, orderBy: { expiryDate: 'asc' }, take: Math.min(Math.max(limit, 1), 50) });
    return documents.map((document) => ({ ...document, status: calculateConfigurableDocumentStatus(document.expiryDate, null, new Date(), warningDays) })).filter((document) => document.status === DocumentStatus.EXPIRING_SOON || document.status === DocumentStatus.EXPIRED);
  }

  async recent(userId: string, limit = 10) {
    if (!(await this.canViewDocuments(userId))) return [];
    const warningDays = await this.settings.getWarningThresholdDays();
    const documents = await this.prisma.document.findMany({ where: { archivedAt: null }, select: { id: true, title: true, documentNumber: true, documentType: true, counterparty: true, expiryDate: true }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 50) });
    return documents.map((document) => ({ ...document, status: calculateConfigurableDocumentStatus(document.expiryDate, null, new Date(), warningDays) }));
  }
}
