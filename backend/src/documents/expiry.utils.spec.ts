import { DocumentStatus } from './documents.types';
import { calculateDocumentStatus } from './expiry.utils';

describe('calculateDocumentStatus', () => {
  const now = new Date('2026-08-22T00:00:00.000Z');
  const addDays = (days: number) => new Date(now.getTime() + days * 86400000);

  it('returns NO_EXPIRY when expiry is absent', () => expect(calculateDocumentStatus(null, null, now)).toBe(DocumentStatus.NO_EXPIRY));
  it('returns ARCHIVED before other states', () => expect(calculateDocumentStatus(addDays(10), new Date(), now)).toBe(DocumentStatus.ARCHIVED));
  it('returns EXPIRED for a past date', () => expect(calculateDocumentStatus(addDays(-1), null, now)).toBe(DocumentStatus.EXPIRED));
  it('returns EXPIRING_SOON through day 30', () => {
    expect(calculateDocumentStatus(addDays(0), null, now)).toBe(DocumentStatus.EXPIRING_SOON);
    expect(calculateDocumentStatus(addDays(30), null, now)).toBe(DocumentStatus.EXPIRING_SOON);
  });
  it('returns ACTIVE beyond the 30-day window', () => expect(calculateDocumentStatus(addDays(31), null, now)).toBe(DocumentStatus.ACTIVE));
});
