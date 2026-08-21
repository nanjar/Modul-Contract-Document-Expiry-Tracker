import { DocumentsService } from './documents.service';
import { DocumentStatus } from './documents.types';

describe('DocumentsService status', () => {
  const service = new DocumentsService({} as never);

  it('returns archived before any date status', () => {
    expect(service.status({ archivedAt: new Date(), expiryDate: null })).toBe(DocumentStatus.ARCHIVED);
  });

  it('returns no expiry when expiry date is absent', () => {
    expect(service.status({ archivedAt: null, expiryDate: null })).toBe(DocumentStatus.NO_EXPIRY);
  });

  it('returns expired for past dates', () => {
    expect(service.status({ archivedAt: null, expiryDate: new Date(Date.now() - 86400000) })).toBe(DocumentStatus.EXPIRED);
  });

  it('returns expiring soon inside the warning window', () => {
    expect(service.status({ archivedAt: null, expiryDate: new Date(Date.now() + 7 * 86400000) }, 30)).toBe(DocumentStatus.EXPIRING_SOON);
  });

  it('returns active beyond the warning window', () => {
    expect(service.status({ archivedAt: null, expiryDate: new Date(Date.now() + 90 * 86400000) }, 30)).toBe(DocumentStatus.ACTIVE);
  });
});
