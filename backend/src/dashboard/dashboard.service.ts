import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStatus } from '../documents/documents.types';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getStatus(expiryDate: Date | null): DocumentStatus {
    if (!expiryDate) {
      return DocumentStatus.NO_EXPIRY;
    }

    const now = new Date();
    const expiry = new Date(expiryDate);

    if (expiry < now) {
      return DocumentStatus.EXPIRED;
    }

    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + 30);

    if (expiry <= threshold) {
      return DocumentStatus.EXPIRING_SOON;
    }

    return DocumentStatus.ACTIVE;
  }

  async summary() {
    const documents = await this.prisma.document.findMany({
      where: {
        archivedAt: null,
      },
      select: {
        expiryDate: true,
      },
    });

    const counts = {
      total: documents.length,
      active: 0,
      expiringSoon: 0,
      expired: 0,
      noExpiry: 0,
    };

    for (const document of documents) {
      switch (this.getStatus(document.expiryDate)) {
        case DocumentStatus.ACTIVE:
          counts.active++;
          break;

        case DocumentStatus.EXPIRING_SOON:
          counts.expiringSoon++;
          break;

        case DocumentStatus.EXPIRED:
          counts.expired++;
          break;

        case DocumentStatus.NO_EXPIRY:
          counts.noExpiry++;
          break;
      }
    }

    return counts;
  }

  async expiring(limit = 10) {
    const documents = await this.prisma.document.findMany({
      where: {
        archivedAt: null,
        expiryDate: {
          not: null,
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return documents
      .map((document) => ({
        ...document,
        status: this.getStatus(document.expiryDate),
      }))
      .filter(
        (document) =>
          document.status === DocumentStatus.EXPIRING_SOON ||
          document.status === DocumentStatus.EXPIRED,
      );
  }

  async recent(limit = 10) {
    const documents = await this.prisma.document.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return documents.map((document) => ({
      ...document,
      status: this.getStatus(document.expiryDate),
    }));
  }
}
