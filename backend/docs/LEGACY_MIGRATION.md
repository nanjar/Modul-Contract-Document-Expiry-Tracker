# Legacy Office Automation Migration

The PRD v1.1 migration path moves legacy spreadsheet data into PostgreSQL and removes spreadsheet dependency from production workflows.

## Input

Export the legacy workbook sheets as UTF-8 CSV files into one directory. The importer recognizes:

- Employees.csv
- Attendance.csv
- LeaveRequests.csv
- LateRequests.csv
- WFHRequests.csv
- OvertimeRequests.csv
- ReimbursementRequests.csv
- BusinessTripRequests.csv
- AssetRequests.csv
- MeetingBookings.csv
- Announcements.csv
- ReadReceipts.csv

## Safety

The importer is **dry-run by default**. It does not write to PostgreSQL until `--apply` is supplied. Each execution creates a JSON reconciliation report under `backend/reports/` containing rows read, imported, skipped, duplicates and validation errors.

Legacy employee passwords are never imported. Imported users receive the sentinel password hash `LEGACY_MIGRATION_PASSWORD_RESET_REQUIRED` and must complete the platform password reset flow before login.

## Commands

```bash
pnpm legacy:dry-run -- --input=/absolute/path/to/legacy-data
pnpm legacy:apply -- --input=/absolute/path/to/legacy-data
```

Run the dry-run and resolve every skipped/error row before applying. PostgreSQL remains the source of truth after migration; the workbook must not be used by application runtime.
