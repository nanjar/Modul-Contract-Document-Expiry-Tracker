import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from './documents.types';

export interface DocumentRecord {
  id: string;
  title: string;
  documentType: string;
  expiryDate: string | null;
  archived: boolean;
}

@Injectable()
export class DocumentsService {
  private readonly documents: DocumentRecord[] = [];

  list(): DocumentRecord[] {
    return this.documents.map((document) => ({ ...document }));
  }

  findOne(id: string): DocumentRecord {
    const document = this.documents.find((item) => item.id === id);
    if (!document) throw new NotFoundException('Document not found');
    return { ...document };
  }

  create(input: Omit<DocumentRecord, 'id' | 'archived'>): DocumentRecord {
    const document: DocumentRecord = {
      ...input,
      id: crypto.randomUUID(),
      archived: false,
    };
    this.documents.unshift(document);
    return { ...document };
  }

  status(document: DocumentRecord, warningDays = 30): DocumentStatus {
    if (document.archived) return DocumentStatus.ARCHIVED;
    if (!document.expiryDate) return DocumentStatus.NO_EXPIRY;
    const today = new Date();
    const expiry = new Date(document.expiryDate);
    if (expiry < today) return DocumentStatus.EXPIRED;
    const threshold = new Date(today);
    threshold.setDate(threshold.getDate() + warningDays);
    if (expiry <= threshold) return DocumentStatus.EXPIRING_SOON;
    return DocumentStatus.ACTIVE;
  }
}
