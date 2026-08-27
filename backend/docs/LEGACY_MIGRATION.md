# Legacy Office Automation Migration

PRD v1.1 moves legacy spreadsheet data into PostgreSQL and removes spreadsheet dependency from production workflows.

## Input

The importer accepts either:

1. A directory of UTF-8 CSV exports named after the legacy sheets; or
2. A normalized JSON workbook where each sheet is an array, for example:

```json
{
  "Employees": [{"Name":"...","Email":"...","ChatId":"..."}],
  "Attendance": [],
  "Announcements": [],
  "ReadReceipts": [],
  "LeaveRequests": [],
  "LateRequests": [],
  "OvertimeRequests": [],
  "WFHRequests": [],
  "ReimbursementRequests": [],
  "MeetingBookings": [],
  "BusinessTripRequests": [],
  "AssetRequests": []
}
```

The actual legacy workbook inventory includes Employees, Attendance, Sessions, Announcements, ReadReceipts, LeaveRequests, LateRequests, OvertimeRequests, WFHRequests, ReimbursementRequests, MeetingBookings, BusinessTripRequests and AssetRequests. `Sessions` and the legacy `Dashboard` are derived/operational artifacts and are intentionally not persisted as source tables.

## Mapping

- Employees -> shared `User` + `UserTelegramIdentity`
- Attendance -> `AttendanceRecord` + `AttendanceActionLog`
- Leave/Late/WFH/Overtime/Reimbursement/BusinessTrip/Asset -> `OfficeRequest`
- Announcements -> `Announcement`
- ReadReceipts -> `AnnouncementReadReceipt`
- MeetingBookings -> `MeetingRoom` + `MeetingBooking` + `MeetingAttendee`

Migration is idempotent for the supported entity keys and produces duplicate counts instead of creating another copy.

## Safety

The importer is **dry-run by default**. It does not write to PostgreSQL until `--apply` is supplied. Each execution creates a JSON reconciliation report under `backend/reports/` containing rows read, imported, skipped, duplicates and validation errors.

Legacy employee passwords are never imported. Imported users receive the sentinel password hash `LEGACY_MIGRATION_PASSWORD_RESET_REQUIRED` and must complete the platform password reset flow before login.

## Commands

```bash
pnpm legacy:dry-run -- --input=/absolute/path/to/legacy-data
pnpm legacy:apply -- --input=/absolute/path/to/legacy-data
```

Run the dry-run and resolve every skipped/error row before applying. PostgreSQL remains the source of truth after migration; the workbook must not be used by application runtime.
