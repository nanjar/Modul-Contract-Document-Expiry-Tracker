import { DocumentStatus } from './documents.types';
import { calculateConfigurableDocumentStatus, configurableExpiryWindow } from './configurable-expiry.utils';

describe('configurable expiry helpers', () => {
  const now = new Date('2026-08-23T15:00:00.000Z');

  it('uses the configured warning threshold', () => {
    const { today, threshold } = configurableExpiryWindow(now, 14);
    expect(today.toISOString()).toBe('2026-08-23T00:00:00.000Z');
    expect(threshold.toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });

  it('classifies expiry dates using calendar-day semantics', () => {
    expect(calculateConfigurableDocumentStatus(new Date('2026-08-23T23:59:59Z'), null, now, 30)).toBe(DocumentStatus.EXPIRING_SOON);
    expect(calculateConfigurableDocumentStatus(new Date('2026-08-22T23:59:59Z'), null, now, 30)).toBe(DocumentStatus.EXPIRED);
    expect(calculateConfigurableDocumentStatus(new Date('2026-09-07T00:00:00Z'), null, now, 14)).toBe(DocumentStatus.ACTIVE);
  });
});
