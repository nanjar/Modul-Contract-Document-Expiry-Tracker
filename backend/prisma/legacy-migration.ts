import { PrismaClient, OfficeRequestStatus, OfficeRequestType, AttendanceAction, AttendanceStatus } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Legacy Office Automation importer.
 *
 * Input directory contains CSV exports of the legacy workbook sheets:
 * Employees, Attendance, LeaveRequests, LateRequests, WFHRequests,
 * OvertimeRequests, ReimbursementRequests, BusinessTripRequests,
 * AssetRequests, MeetingBookings, Announcements and ReadReceipts.
 *
 * The importer is deliberately dry-run by default. Use --apply to write
 * PostgreSQL. Every run writes a reconciliation report to reports/.
 */
const prisma = new PrismaClient();
const inputDir = process.argv.find((a) => a.startsWith('--input='))?.slice(8) ?? './legacy-data';
const apply = process.argv.includes('--apply');
const reportDir = './reports';

type Row = Record<string, string>;
type Result = { sheet: string; read: number; imported: number; skipped: number; duplicates: number; errors: string[] };

function csvRows(file: string): Row[] {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const parse = (line: string) => {
    const out: string[] = [];
    let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) { out.push(value.trim()); value = ''; }
      else value += c;
    }
    out.push(value.trim());
    return out;
  };
  const headers = parse(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parse(line); return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

const text = (v: unknown) => String(v ?? '').trim() || undefined;
const date = (v: unknown) => {
  const s = text(v); if (!s) return undefined;
  const d = new Date(s); return Number.isNaN(d.getTime()) ? undefined : d;
};
const status = (v: unknown): OfficeRequestStatus => {
  const s = String(v ?? '').trim().toUpperCase();
  return (['PENDING','APPROVED','REJECTED','CANCELLED','IN_PROGRESS','COMPLETED'] as string[]).includes(s)
    ? s as OfficeRequestStatus : OfficeRequestStatus.PENDING;
};
const requestType = (sheet: string): OfficeRequestType => ({
  LeaveRequests: OfficeRequestType.LEAVE,
  LateRequests: OfficeRequestType.LATE,
  WFHRequests: OfficeRequestType.WFH,
  OvertimeRequests: OfficeRequestType.OVERTIME,
  ReimbursementRequests: OfficeRequestType.REIMBURSEMENT,
  BusinessTripRequests: OfficeRequestType.BUSINESS_TRIP,
  MeetingBookings: OfficeRequestType.MEETING,
  AssetRequests: OfficeRequestType.GENERAL,
}[sheet] ?? OfficeRequestType.GENERAL);

async function main() {
  const results: Result[] = [];
  const employees = csvRows(join(inputDir, 'Employees.csv'));
  const users = new Map<string, string>();
  const chats = new Map<string, string>();
  const employeeResult: Result = { sheet: 'Employees', read: employees.length, imported: 0, skipped: 0, duplicates: 0, errors: [] };

  for (const row of employees) {
    const email = text(row.Email)?.toLowerCase();
    const name = text(row.Name);
    const chatId = text(row.ChatId);
    if (!email || !name) { employeeResult.skipped++; employeeResult.errors.push('Employee row missing Email or Name'); continue; }
    try {
      if (apply) {
        const user = await prisma.user.upsert({
          where: { email },
          update: { name, department: text(row.Division), position: text(row.Position), isActive: true },
          create: {
            email, name, department: text(row.Division), position: text(row.Position),
            passwordHash: 'LEGACY_MIGRATION_PASSWORD_RESET_REQUIRED',
          },
        });
        users.set(email, user.id); if (chatId) chats.set(chatId, user.id);
      }
      employeeResult.imported++;
    } catch (e) { employeeResult.skipped++; employeeResult.errors.push(`${email}: ${String(e)}`); }
  }
  results.push(employeeResult);

  const requestSheets = ['LeaveRequests','LateRequests','WFHRequests','OvertimeRequests','ReimbursementRequests','BusinessTripRequests','MeetingBookings','AssetRequests'];
  for (const sheet of requestSheets) {
    const rows = csvRows(join(inputDir, `${sheet}.csv`));
    const result: Result = { sheet, read: rows.length, imported: 0, skipped: 0, duplicates: 0, errors: [] };
    for (const row of rows) {
      const chatId = text(row.ChatId); const requesterId = chatId ? chats.get(chatId) : undefined;
      const name = text(row.Name);
      if (!requesterId && apply) { result.skipped++; result.errors.push(`No employee match for ChatId=${chatId ?? '-'} Name=${name ?? '-'}`); continue; }
      const requestedAt = date(row.RequestedAt) ?? new Date();
      const number = `LEGACY-${sheet}-${requestedAt.getTime()}-${result.read}`;
      if (apply) {
        try {
          await prisma.officeRequest.create({
            data: {
              requestNumber: number,
              type: requestType(sheet),
              requesterId: requesterId!,
              title: name ? `${sheet.replace('Requests','')} request - ${name}` : `${sheet} legacy request`,
              description: text(row.Reason) ?? text(row.Keterangan),
              startDate: date(row.StartDate) ?? date(row.Date),
              endDate: date(row.EndDate),
              requiredDate: date(row.Date) ?? date(row.EstimatedArrival),
              priority: 'NORMAL',
              status: status(row.Status),
              requestedAt,
              metadata: row,
            },
          });
        } catch (e) { result.skipped++; result.errors.push(`${number}: ${String(e)}`); continue; }
      }
      result.imported++;
    }
    results.push(result);
  }

  const attendance = csvRows(join(inputDir, 'Attendance.csv'));
  const attendanceResult: Result = { sheet: 'Attendance', read: attendance.length, imported: 0, skipped: 0, duplicates: 0, errors: [] };
  for (const row of attendance) {
    const userId = text(row.ChatId) ? chats.get(text(row.ChatId)!) : undefined;
    const day = date(row.Date); const action = String(row.Action ?? '').toUpperCase();
    if ((!userId || !day) && apply) { attendanceResult.skipped++; attendanceResult.errors.push(`Invalid attendance row ChatId=${row.ChatId}`); continue; }
    if (apply) {
      try {
        const existing = await prisma.attendanceRecord.findFirst({ where: { userId: userId!, attendanceDate: day! } });
        const time = text(row.Time); const stamp = time ? date(`${row.Date} ${time}`) : day;
        const isCheckIn = action.includes('IN') || action.includes('CHECK_IN');
        await prisma.attendanceRecord.upsert({
          where: { userId_attendanceDate: { userId: userId!, attendanceDate: day! } },
          update: isCheckIn ? { checkInAt: stamp } : { checkOutAt: stamp },
          create: { userId: userId!, attendanceDate: day!, status: AttendanceStatus.PRESENT, ...(isCheckIn ? { checkInAt: stamp } : { checkOutAt: stamp }) },
        });
        await prisma.attendanceActionLog.create({
          data: { userId: userId!, attendanceId: existing?.id, action: isCheckIn ? AttendanceAction.CHECK_IN : AttendanceAction.CHECK_OUT,
            latitude: text(row.Latitude) ? Number(row.Latitude) : undefined, longitude: text(row.Longitude) ? Number(row.Longitude) : undefined,
            source: 'LEGACY_MIGRATION', metadata: row },
        });
      } catch (e) { attendanceResult.skipped++; attendanceResult.errors.push(String(e)); continue; }
    }
    attendanceResult.imported++;
  }
  results.push(attendanceResult);

  mkdirSync(reportDir, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), inputDir, mode: apply ? 'APPLY' : 'DRY_RUN', results,
    totals: results.reduce((a, r) => ({ read: a.read+r.read, imported: a.imported+r.imported, skipped: a.skipped+r.skipped, duplicates: a.duplicates+r.duplicates }), { read:0, imported:0, skipped:0, duplicates:0 }) };
  const path = join(reportDir, `legacy-migration-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (results.some((r) => r.errors.length)) process.exitCode = 2;
}

main().finally(() => prisma.$disconnect());
