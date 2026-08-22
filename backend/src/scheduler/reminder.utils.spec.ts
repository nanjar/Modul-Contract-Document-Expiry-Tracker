import { isReminderDue } from './reminder.utils';

describe('isReminderDue', () => {
  const expiry = new Date('2026-09-21T00:00:00.000Z');
  it('is false before the reminder date', () => expect(isReminderDue(expiry, 30, new Date('2026-08-20T23:59:59.000Z'))).toBe(false));
  it('is true on the reminder date', () => expect(isReminderDue(expiry, 30, new Date('2026-08-22T00:00:00.000Z'))).toBe(true));
  it('is true between reminder date and expiry', () => expect(isReminderDue(expiry, 30, new Date('2026-09-01T00:00:00.000Z'))).toBe(true));
  it('is false at or after expiry', () => expect(isReminderDue(expiry, 30, expiry)).toBe(false));
});
