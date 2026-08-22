export function isReminderDue(expiryDate: Date, daysBefore: number, now = new Date()): boolean {
  const dueAt = new Date(expiryDate);
  dueAt.setDate(dueAt.getDate() - daysBefore);
  return now >= dueAt && now < expiryDate;
}
