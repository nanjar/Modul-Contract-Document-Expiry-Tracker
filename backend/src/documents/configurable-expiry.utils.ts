import { DocumentStatus } from './documents.types';
import { startOfUtcDay } from './expiry.utils';

export function configurableExpiryWindow(now: Date, warningDays: number) {
  const today = startOfUtcDay(now);
  const threshold = new Date(today);
  threshold.setUTCDate(threshold.getUTCDate() + Math.max(0, warningDays));
  return { today, threshold };
}

export function calculateConfigurableDocumentStatus(
  expiryDate: Date | null,
  archivedAt: Date | null,
  now: Date,
  warningDays: number,
): DocumentStatus {
  if (archivedAt) return DocumentStatus.ARCHIVED;
  if (!expiryDate) return DocumentStatus.NO_EXPIRY;
  const expiryDay = startOfUtcDay(expiryDate);
  const { today, threshold } = configurableExpiryWindow(now, warningDays);
  if (expiryDay < today) return DocumentStatus.EXPIRED;
  if (expiryDay <= threshold) return DocumentStatus.EXPIRING_SOON;
  return DocumentStatus.ACTIVE;
}
