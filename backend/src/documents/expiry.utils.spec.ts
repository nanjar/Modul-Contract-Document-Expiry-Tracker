import { DocumentStatus } from './documents.types';
import { calculateDocumentStatus } from './expiry.utils';

describe('calculateDocumentStatus', () => {
  const now = new Date('2026-08-22T12:00:00.000Z');
  const addDays = (days: number) => new Date(Date.UTC(2026, 7, 22 + days));

  it('returns NO_EXPIRY when expiry is absent', () => expect(calculateDocumentStatus(null, null, now)).toBe(DocumentStatus.NO_EXPIRY));
  it('returns ARCHIVED before other states', () => expect(calculateDocumentStatus(addDays(10), new Date(), now)).toBe(DocumentStatus.ARCHIVED));
  it('keeps a document valid throughout its expiry date', () => expect(calculateDocumentStatus(new Date('2026-08-22T00:00:00.000Z'), null, now)).toBe(DocumentStatus.EXPIRING_SOON));
  it('returns EXPIRED for a previous calendar date', () => expect(calculateDocumentStatus(addDays(-1), null, now)).toBe(DocumentStatus.EXPIRED));
  it('returns EXPIRING_SOON through day 30', () => {
    expect(calculateDocumentStatus(addDays(0), null, now)).toBe(DocumentStatus.EXPIRING_SOON);
    expect(calculateDocumentStatus(addDays(30), null, now)).toBe(DocumentStatus.EXPIRING_SOON);
  });
  it('returns ACTIVE beyond the 30-day window', () => expect(calculateDocumentStatus(addDays(31), null, now)).toBe(DocumentStatus.ACTIVE));
});
