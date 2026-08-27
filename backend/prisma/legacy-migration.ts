import * as XLSX from 'xlsx';
import { PrismaClient, OfficeRequestStatus, OfficeRequestType, AttendanceAction, AttendanceStatus, AnnouncementRecipientType, AnnouncementStatus } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Legacy HRD workbook -> PostgreSQL migration. Dry-run by default. */
const prisma = new PrismaClient();
const input = process.argv.find((a) => a.startsWith('--input='))?.slice(8) ?? './legacy-data/HRD Entry Level.xlsx';
const apply = process.argv.includes('--apply');
const reportDir = './reports';
type Row = Record<string, unknown>;
type Result = { sheet: string; read: number; imported: number; skipped: number; duplicates: number; errors: string[] };
const text = (v: unknown) => String(v ?? '').trim() || undefined;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
const dt = (v: unknown) => { if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v; const s = text(v); if (!s) return undefined; const d = new Date(s); return Number.isNaN(d.getTime()) ? undefined : d; };
const rows = (sheet: XLSX.WorkSheet): Row[] => XLSX.utils.sheet_to_json<Row>(sheet, { defval: undefined, raw: false });
const status = (v: unknown): OfficeRequestStatus => { const s = String(v ?? '').trim().toUpperCase(); return (Object.values(OfficeRequestStatus) as string[]).includes(s) ? s as OfficeRequestStatus : OfficeRequestStatus.PENDING; };
const type = (sheet: string): OfficeRequestType => ({ LeaveRequests: OfficeRequestType.LEAVE, LateRequests: OfficeRequestType.LATE, WFHRequests: OfficeRequestType.WFH, OvertimeRequests: OfficeRequestType.OVERTIME, ReimbursementRequests: OfficeRequestType.REIMBURSEMENT, BusinessTripRequests: OfficeRequestType.BUSINESS_TRIP, MeetingBookings: OfficeRequestType.MEETING, AssetRequests: OfficeRequestType.GENERAL }[sheet] ?? OfficeRequestType.GENERAL);
const result = (sheet: string, read: number): Result => ({ sheet, read, imported: 0, skipped: 0, duplicates: 0, errors: [] });

async function main() {
  const file = resolve(input);
  if (!existsSync(file)) throw new Error(`Legacy workbook not found: ${file}`);
  const wb = XLSX.readFile(file, { cellDates: true });
  const get = (name: string) => wb.Sheets[name] ? rows(wb.Sheets[name]) : [];
  const results: Result[] = [];
  const users = new Map<string, string>();
  const chats = new Map<string, string>();
  const names = new Map<string, string>();
  const announcements = new Map<string, string>();

  const employees = get('Employees'); const er = result('Employees', employees.length);
  for (const r of employees) {
    const email = text(r.Email)?.toLowerCase(), name = text(r.Name), chat = text(r.ChatId);
    if (!email || !name) { er.skipped++; er.errors.push('Missing Email or Name'); continue; }
    try {
      if (apply) {
        const u = await prisma.user.upsert({ where: { email }, update: { name, department: text(r.Division), position: text(r.Position), isActive: true }, create: { email, name, department: text(r.Division), position: text(r.Position), passwordHash: 'LEGACY_MIGRATION_PASSWORD_RESET_REQUIRED' } });
        users.set(email, u.id); names.set(name.toLowerCase(), u.id); if (chat) chats.set(chat, u.id);
        if (chat) await prisma.userTelegramIdentity.upsert({ where: { chatId: chat }, update: { userId: u.id, isVerified: false }, create: { userId: u.id, chatId: chat, isVerified: false } });
      }
      er.imported++;
    } catch (e) { er.skipped++; er.errors.push(`${email}: ${String(e)}`); }
  }
  results.push(er);

  const attendance = get('Attendance'); const ar = result('Attendance', attendance.length);
  for (const r of attendance) {
    const userId = text(r.ChatId) ? chats.get(text(r.ChatId)!) : undefined, day = dt(r.Date);
    if (!userId || !day) { ar.skipped++; ar.errors.push(`Unresolved employee/date: ${text(r.ChatId) ?? '-'}`); continue; }
    try {
      if (apply) {
        const isIn = String(r.Action ?? '').toUpperCase().includes('IN');
        const stamp = dt(`${text(r.Date)} ${text(r.Time) ?? ''}`) ?? day;
        const record = await prisma.attendanceRecord.upsert({ where: { userId_attendanceDate: { userId, attendanceDate: day } }, update: isIn ? { checkInAt: stamp } : { checkOutAt: stamp }, create: { userId, attendanceDate: day, status: AttendanceStatus.PRESENT, ...(isIn ? { checkInAt: stamp } : { checkOutAt: stamp }) } });
        await prisma.attendanceActionLog.create({ data: { userId, attendanceId: record.id, action: isIn ? AttendanceAction.CHECK_IN : AttendanceAction.CHECK_OUT, latitude: num(r.Latitude), longitude: num(r.Longitude), source: 'LEGACY_MIGRATION', metadata: r as object } });
      }
      ar.imported++;
    } catch (e) { ar.skipped++; ar.errors.push(String(e)); }
  }
  results.push(ar);

  const requestSheets = ['LeaveRequests','LateRequests','WFHRequests','OvertimeRequests','ReimbursementRequests','BusinessTripRequests','AssetRequests'];
  for (const sheet of requestSheets) {
    const rs = get(sheet), rr = result(sheet, rs.length);
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i], chat = text(r.ChatId), requesterId = chat ? chats.get(chat) : undefined;
      if (!requesterId) { rr.skipped++; rr.errors.push(`Unresolved employee ChatId=${chat ?? '-'}`); continue; }
      const requestedAt = dt(r.RequestedAt) ?? new Date();
      const requestNumber = `LEGACY-${sheet}-${i + 2}`;
      try {
        if (apply) {
          const existing = await prisma.officeRequest.findUnique({ where: { requestNumber } });
          if (existing) { rr.duplicates++; continue; }
          await prisma.officeRequest.create({ data: { requestNumber, type: type(sheet), requesterId, title: `${sheet.replace('Requests','')} request - ${text(r.Name) ?? 'Legacy'}`, description: text(r.Reason) ?? text(r.Keterangan), startDate: dt(r.StartDate) ?? dt(r.Date), endDate: dt(r.EndDate), requiredDate: dt(r.Date) ?? dt(r.EstimatedArrival), priority: 'NORMAL', status: status(r.Status), requestedAt, metadata: r as object } });
        }
        rr.imported++;
      } catch (e) { rr.skipped++; rr.errors.push(`${requestNumber}: ${String(e)}`); }
    }
    results.push(rr);
  }

  const announcementsRows = get('Announcements'); const nr = result('Announcements', announcementsRows.length);
  for (let i = 0; i < announcementsRows.length; i++) {
    const r = announcementsRows[i], key = text(r.ID) ?? `ROW-${i + 2}`, title = text(r.Title), message = text(r.Content);
    if (!title || !message) { nr.skipped++; nr.errors.push(`Announcement ${key} missing Title/Content`); continue; }
    try {
      if (apply) {
        const creatorId = (text(r.PIC) && (names.get(text(r.PIC)!.toLowerCase()) || users.get(text(r.PIC)!.toLowerCase()))) || (await prisma.user.findFirst({ where: { role: 'SUPERUSER' }, select: { id: true } }))?.id;
        if (!creatorId) { nr.skipped++; nr.errors.push(`Announcement ${key} has no resolvable creator`); continue; }
        const existing = await prisma.announcement.findFirst({ where: { metadata: { path: ['legacyId'], equals: key } } });
        if (existing) { nr.duplicates++; announcements.set(key, existing.id); continue; }
        const target = String(r.Target ?? '').toUpperCase();
        const recipientType = target.startsWith('ROLE:') ? AnnouncementRecipientType.ROLE : AnnouncementRecipientType.ALL;
        const created = await prisma.announcement.create({ data: { title, message, status: AnnouncementStatus.PUBLISHED, recipientType, recipientRole: target.includes('SUPERUSER') ? 'SUPERUSER' : undefined, createdById: creatorId, publishedAt: dt(`${text(r.Date) ?? ''} ${text(r.Time) ?? ''}`) ?? new Date(), metadata: { legacyId: key, legacyRow: r as object } } });
        announcements.set(key, created.id);
      }
      nr.imported++;
    } catch (e) { nr.skipped++; nr.errors.push(`${key}: ${String(e)}`); }
  }
  results.push(nr);

  const reads = get('ReadReceipts'); const rr = result('ReadReceipts', reads.length);
  for (const r of reads) {
    const announcementId = text(r.AnnouncementID) ? announcements.get(text(r.AnnouncementID)!) : undefined, userId = text(r.ChatId) ? chats.get(text(r.ChatId)!) : undefined;
    if (!announcementId || !userId) { rr.skipped++; rr.errors.push(`Unresolved AnnouncementID=${text(r.AnnouncementID) ?? '-'} ChatId=${text(r.ChatId) ?? '-'}`); continue; }
    try { if (apply) await prisma.announcementReadReceipt.upsert({ where: { announcementId_userId: { announcementId, userId } }, update: { readAt: dt(r.ReadAt) ?? new Date() }, create: { announcementId, userId, readAt: dt(r.ReadAt) ?? new Date() } }); rr.imported++; } catch (e) { rr.skipped++; rr.errors.push(String(e)); }
  }
  results.push(rr);

  const meetings = get('MeetingBookings'); const mr = result('MeetingBookings', meetings.length);
  for (let i = 0; i < meetings.length; i++) {
    const r = meetings[i], creatorId = text(r.ChatId) ? chats.get(text(r.ChatId)!) : undefined, start = dt(`${text(r.Date) ?? ''} ${text(r.StartTime) ?? ''}`), end = dt(`${text(r.Date) ?? ''} ${text(r.EndTime) ?? ''}`), title = text(r.Name) ? `Meeting - ${text(r.Name)}` : `Legacy Meeting ${i + 2}`;
    if (!creatorId || !start || !end) { mr.skipped++; mr.errors.push(`Invalid meeting row ${i + 2}`); continue; }
    try {
      if (apply) {
        const roomName = text(r.Room) ?? 'Legacy Room';
        const room = await prisma.meetingRoom.upsert({ where: { name: roomName }, update: { isActive: true }, create: { name: roomName } });
        const existing = await prisma.meetingBooking.findFirst({ where: { roomId: room.id, createdById: creatorId, startsAt: start, endsAt: end, title } });
        if (existing) { mr.duplicates++; continue; }
        const booking = await prisma.meetingBooking.create({ data: { roomId: room.id, createdById: creatorId, title, startsAt: start, endsAt: end, status: status(r.Status), metadata: r as object } });
        const participantTokens = String(r.Participants ?? '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
        for (const token of participantTokens) { const uid = chats.get(token) || names.get(token.toLowerCase()); if (uid) await prisma.meetingAttendee.upsert({ where: { meetingId_userId: { meetingId: booking.id, userId: uid } }, update: {}, create: { meetingId: booking.id, userId: uid } }); }
      }
      mr.imported++;
    } catch (e) { mr.skipped++; mr.errors.push(String(e)); }
  }
  results.push(mr);

  for (const sheet of ['Sessions','Dashboard']) { const count = get(sheet).length; results.push({ sheet, read: count, imported: 0, skipped: count, duplicates: 0, errors: [`${sheet} is derived/operational legacy data and is intentionally not persisted as a source table; use PostgreSQL dashboard/session services.`] }); }

  mkdirSync(reportDir, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), source: file, mode: apply ? 'APPLY' : 'DRY_RUN', results, totals: results.reduce((a, r) => ({ read: a.read + r.read, imported: a.imported + r.imported, skipped: a.skipped + r.skipped, duplicates: a.duplicates + r.duplicates }), { read: 0, imported: 0, skipped: 0, duplicates: 0 }) };
  const reportPath = join(reportDir, `legacy-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (results.some((r) => r.errors.length && r.sheet !== 'Sessions' && r.sheet !== 'Dashboard')) process.exitCode = 2;
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
