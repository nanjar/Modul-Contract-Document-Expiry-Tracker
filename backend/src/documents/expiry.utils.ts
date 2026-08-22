import { DocumentStatus } from './documents.types';

export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function expiryWindow(now = new Date()) {
  const today = startOfUtcDay(now);
  const threshold = new Date(today);
  threshold.setUTCDate(threshold.getUTCDate() + 30);
  return { today, threshold };
}

export function calculateDocumentStatus(expiryDate: Date | null, archivedAt: Date | null, now = new Date()): DocumentStatus {
  if (archivedAt) return DocumentStatus.ARCHIVED;
  if (!expiryDate) return DocumentStatus.NO_EXPIRY;

  // Expiry is a business calendar date. A document remains valid throughout
  // its expiry date instead of becoming EXPIRED at midnight.
  const expiryDay = startOfUtcDay(expiryDate);
  const { today, threshold } = expiryWindow(now);

  if (expiryDay < today) return DocumentStatus.EXPIRED;
  if (expiryDay <= threshold) return DocumentStatus.EXPIRING_SOON;
  return DocumentStatus.ACTIVE;
}
