import { DocumentStatus } from './documents.types';

export function calculateDocumentStatus(expiryDate: Date | null, archivedAt: Date | null, now = new Date()): DocumentStatus {
  if (archivedAt) return DocumentStatus.ARCHIVED;
  if (!expiryDate) return DocumentStatus.NO_EXPIRY;
  if (expiryDate < now) return DocumentStatus.EXPIRED;
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + 30);
  if (expiryDate <= threshold) return DocumentStatus.EXPIRING_SOON;
  return DocumentStatus.ACTIVE;
}
