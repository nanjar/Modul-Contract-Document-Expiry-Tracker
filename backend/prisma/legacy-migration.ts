import { PrismaClient, OfficeRequestStatus, OfficeRequestType, AttendanceAction, AttendanceStatus, AnnouncementRecipientType, AnnouncementStatus } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Legacy HRD -> PostgreSQL migration.
 * Input may be a normalized JSON workbook ({SheetName: rows[]}) or a directory of CSV files.
 * Dry-run is the default; pass --apply to write PostgreSQL.
 */
const prisma = new PrismaClient();
const input = process.argv.find((a) => a.startsWith('--input='))?.slice(8) ?? './legacy-data';
const apply = process.argv.includes('--apply');
const reportDir = './reports';
type Row = Record<string, unknown>;
type Result = { sheet: string; read: number; imported: number; skipped: number; duplicates: number; errors: string[] };
const text = (v: unknown) => String(v ?? '').trim() || undefined;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
const dt = (v: unknown) => { const s = text(v); if (!s) return undefined; const d = new Date(s); return Number.isNaN(d.getTime()) ? undefined : d; };
const result = (sheet: string, read: number): Result => ({ sheet, read, imported: 0, skipped: 0, duplicates: 0, errors: [] });
const requestType = (sheet: string): OfficeRequestType => ({ LeaveRequests: OfficeRequestType.LEAVE, LateRequests: OfficeRequestType.LATE, WFHRequests: OfficeRequestType.WFH, OvertimeRequests: OfficeRequestType.OVERTIME, ReimbursementRequests: OfficeRequestType.REIMBURSEMENT, BusinessTripRequests: OfficeRequestType.BUSINESS_TRIP, MeetingBookings: OfficeRequestType.MEETING, AssetRequests: OfficeRequestType.GENERAL }[sheet] ?? OfficeRequestType.GENERAL);
const requestStatus = (v: unknown): OfficeRequestStatus => { const s = String(v ?? '').trim().toUpperCase(); return (Object.values(OfficeRequestStatus) as string[]).includes(s) ? s as OfficeRequestStatus : OfficeRequestStatus.PENDING; };

function csvRows(file: string): Row[] {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parse = (line: string) => { const out: string[] = []; let value = '', quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"') { if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; } else if (c === ',' && !quoted) { out.push(value.trim()); value = ''; } else value += c; } out.push(value.trim()); return out; };
  const headers = parse(lines[0]);
  return lines.slice(1).map((line) => { const values = parse(line); return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])); });
}

function loadSheets(path: string): Record<string, Row[]> {
  if (path.toLowerCase().endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8')) as Record<string, Row[]>;
  const sheetNames = ['Employees','Attendance','Sessions','Announcements','ReadReceipts','LeaveRequests','LateRequests','OvertimeRequests','WFHRequests','ReimbursementRequests','MeetingBookings','BusinessTripRequests','AssetRequests'];
  return Object.fromEntries(sheetNames.map((sheet) => [sheet, csvRows(join(path, `${sheet}.csv`))]));
}

async function main() {
  const source = resolve(input);
  if (!existsSync(source)) throw new Error(`Legacy source not found: ${source}`);
  const sheets = loadSheets(source);
  const results: Result[] = [];
  const chats = new Map<string, string>();
  const names = new Map<string, string>();
  const announcements = new Map<string, string>();

  const employees = sheets.Employees ?? []; const er = result('Employees', employees.length);
  for (const row of employees) {
    const email = text(row.Email)?.toLowerCase(), name = text(row.Name), chat = text(row.ChatId);
    if (!email || !name) { er.skipped++; er.errors.push('Missing Email or Name'); continue; }
    try {
      if (apply) {
        const user = await prisma.user.upsert({ where: { email }, update: { name, department: text(row.Division), position: text(row.Position), isActive: true }, create: { email, name, department: text(row.Division), position: text(row.Position), passwordHash: 'LEGACY_MIGRATION_PASSWORD_RESET_REQUIRED' } });
        if (chat) { chats.set(chat, user.id); await prisma.userTelegramIdentity.upsert({ where: { chatId: chat }, update: { userId: user.id }, create: { userId: user.id, chatId: chat, isVerified: false } }); }
        names.set(name.toLowerCase(), user.id);
      } else if (chat) chats.set(chat, `DRY_RUN:${email}`);
      er.imported++;
    } catch (e) { er.skipped++; er.errors.push(`${email}: ${String(e)}`); }
  }
  results.push(er);

  const attendance = sheets.Attendance ?? []; const ar = result('Attendance', attendance.length);
  for (const row of attendance) {
    const userId = text(row.ChatId) ? chats.get(text(row.ChatId)!) : undefined, day = dt(row.Date);
    if (!userId || !day) { ar.skipped++; ar.errors.push(`Unresolved employee/date ChatId=${text(row.ChatId) ?? '-'}`); continue; }
    if (!apply) { ar.imported++; continue; }
    try {
      const isIn = String(row.Action ?? '').toUpperCase().includes('IN');
      const stamp = dt(`${text(row.Date) ?? ''} ${text(row.Time) ?? ''}`) ?? day;
      const record = await prisma.attendanceRecord.upsert({ where: { userId_attendanceDate: { userId, attendanceDate: day } }, update: isIn ? { checkInAt: stamp } : { checkOutAt: stamp }, create: { userId, attendanceDate: day, status: AttendanceStatus.PRESENT, ...(isIn ? { checkInAt: stamp } : { checkOutAt: stamp }) } });
      await prisma.attendanceActionLog.create({ data: { userId, attendanceId: record.id, action: isIn ? AttendanceAction.CHECK_IN : AttendanceAction.CHECK_OUT, latitude: num(row.Latitude), longitude: num(row.Longitude), source: 'LEGACY_MIGRATION', metadata: row as object } });
      ar.imported++;
    } catch (e) { ar.skipped++; ar.errors.push(String(e)); }
  }
  results.push(ar);

  for (const sheet of ['LeaveRequests','LateRequests','WFHRequests','OvertimeRequests','ReimbursementRequests','BusinessTripRequests','AssetRequests']) {
    const sourceRows = sheets[sheet] ?? [], rr = result(sheet, sourceRows.length);
    for (let i = 0; i < sourceRows.length; i++) {
      const row = sourceRows[i], requesterId = text(row.ChatId) ? chats.get(text(row.ChatId)!) : undefined;
      if (!requesterId || requesterId.startsWith('DRY_RUN:')) { rr.skipped++; rr.errors.push(`Unresolved employee ChatId=${text(row.ChatId) ?? '-'}`); continue; }
      const requestNumber = `LEGACY-${sheet}-${i + 2}`, requestedAt = dt(row.RequestedAt) ?? new Date();
      if (!apply) { rr.imported++; continue; }
      try {
        if (await prisma.officeRequest.findUnique({ where: { requestNumber } })) { rr.duplicates++; continue; }
        await prisma.officeRequest.create({ data: { requestNumber, type: requestType(sheet), requesterId, title: `${sheet.replace('Requests','')} request - ${text(row.Name) ?? 'Legacy'}`, description: text(row.Reason) ?? text(row.Keterangan), startDate: dt(row.StartDate) ?? dt(row.Date), endDate: dt(row.EndDate), requiredDate: dt(row.Date) ?? dt(row.EstimatedArrival), priority: 'NORMAL', status: requestStatus(row.Status), requestedAt, metadata: row as object } });
        rr.imported++;
      } catch (e) { rr.skipped++; rr.errors.push(`${requestNumber}: ${String(e)}`); }
    }
    results.push(rr);
  }

  const announcementRows = sheets.Announcements ?? [], nr = result('Announcements', announcementRows.length);
  for (let i = 0; i < announcementRows.length; i++) {
    const row = announcementRows[i], key = text(row.ID) ?? `ROW-${i + 2}`, title = text(row.Title), message = text(row.Content);
    if (!title || !message) { nr.skipped++; nr.errors.push(`Announcement ${key} missing Title/Content`); continue; }
    if (!apply) { nr.imported++; continue; }
    try {
      const creatorId = (text(row.PIC) && names.get(text(row.PIC)!.toLowerCase())) || (await prisma.user.findFirst({ where: { role: 'SUPERUSER' }, select: { id: true } }))?.id;
      if (!creatorId) { nr.skipped++; nr.errors.push(`Announcement ${key} has no resolvable creator`); continue; }
      const existing = await prisma.announcement.findFirst({ where: { metadata: { path: ['legacyId'], equals: key } } });
      if (existing) { nr.duplicates++; announcements.set(key, existing.id); continue; }
      const target = String(row.Target ?? '').trim();
      const recipientType = target && target.toLowerCase() !== 'semua' ? AnnouncementRecipientType.ROLE : AnnouncementRecipientType.ALL;
      const recipientRole = target.toUpperCase() === 'SUPERUSER' || target.toUpperCase() === 'EDITOR' || target.toUpperCase() === 'VIEWER' ? target.toUpperCase() as 'SUPERUSER' | 'EDITOR' | 'VIEWER' : undefined;
      const created = await prisma.announcement.create({ data: { title, message, status: AnnouncementStatus.PUBLISHED, recipientType, recipientRole, createdById: creatorId, publishedAt: dt(row.Date) ?? new Date(), metadata: { legacyId: key, legacyRow: row as object } } });
      announcements.set(key, created.id); nr.imported++;
    } catch (e) { nr.skipped++; nr.errors.push(`${key}: ${String(e)}`); }
  }
  results.push(nr);

  const readRows = sheets.ReadReceipts ?? [], rd = result('ReadReceipts', readRows.length);
  for (const row of readRows) {
    const announcementId = text(row.AnnouncementID) ? announcements.get(text(row.AnnouncementID)!) : undefined, userId = text(row.ChatId) ? chats.get(text(row.ChatId)!) : undefined;
    if (!announcementId || !userId || userId.startsWith('DRY_RUN:')) { rd.skipped++; rd.errors.push(`Unresolved announcement/employee: ${text(row.AnnouncementID) ?? '-'} / ${text(row.ChatId) ?? '-'}`); continue; }
    if (!apply) { rd.imported++; continue; }
    try { await prisma.announcementReadReceipt.upsert({ where: { announcementId_userId: { announcementId, userId } }, update: { readAt: dt(row.ReadAt) ?? new Date() }, create: { announcementId, userId, readAt: dt(row.ReadAt) ?? new Date() } }); rd.imported++; } catch (e) { rd.skipped++; rd.errors.push(String(e)); }
  }
  results.push(rd);

  const meetings = sheets.MeetingBookings ?? [], mr = result('MeetingBookings', meetings.length);
  for (let i = 0; i < meetings.length; i++) {
    const row = meetings[i], creatorId = text(row.ChatId) ? chats.get(text(row.ChatId)!) : undefined, start = dt(`${text(row.Date) ?? ''} ${text(row.StartTime) ?? ''}`), end = dt(`${text(row.Date) ?? ''} ${text(row.EndTime) ?? ''}`);
    if (!creatorId || creatorId.startsWith('DRY_RUN:') || !start || !end) { mr.skipped++; mr.errors.push(`Invalid meeting row ${i + 2}`); continue; }
    if (!apply) { mr.imported++; continue; }
    try {
      const roomName = text(row.Room) ?? 'Legacy Room';
      const room = await prisma.meetingRoom.upsert({ where: { name: roomName }, update: { isActive: true }, create: { name: roomName } });
      const title = `Meeting - ${text(row.Name) ?? 'Legacy'}`;
      const existing = await prisma.meetingBooking.findFirst({ where: { roomId: room.id, createdById: creatorId, startsAt: start, endsAt: end, title } });
      if (existing) { mr.duplicates++; continue; }
      const booking = await prisma.meetingBooking.create({ data: { roomId: room.id, createdById: creatorId, title, startsAt: start, endsAt: end, status: requestStatus(row.Status), metadata: row as object } });
      for (const token of String(row.Participants ?? '').split(/[,;\n]/).map((v) => v.trim()).filter(Boolean)) { const uid = chats.get(token) || names.get(token.toLowerCase()); if (uid && !uid.startsWith('DRY_RUN:')) await prisma.meetingAttendee.upsert({ where: { meetingId_userId: { meetingId: booking.id, userId: uid } }, update: {}, create: { meetingId: booking.id, userId: uid } }); }
      mr.imported++;
    } catch (e) { mr.skipped++; mr.errors.push(String(e)); }
  }
  results.push(mr);

  for (const sheet of ['Sessions','Dashboard']) { const count = (sheets[sheet] ?? []).length; results.push({ sheet, read: count, imported: 0, skipped: count, duplicates: 0, errors: [`${sheet} is derived/operational legacy data and is intentionally not persisted as a source table.`] }); }

  mkdirSync(reportDir, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), source, mode: apply ? 'APPLY' : 'DRY_RUN', results, totals: results.reduce((a, r) => ({ read: a.read + r.read, imported: a.imported + r.imported, skipped: a.skipped + r.skipped, duplicates: a.duplicates + r.duplicates }), { read: 0, imported: 0, skipped: 0, duplicates: 0 }) };
  writeFileSync(join(reportDir, `legacy-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (results.some((r) => r.errors.length && !['Sessions','Dashboard'].includes(r.sheet))) process.exitCode = 2;
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
