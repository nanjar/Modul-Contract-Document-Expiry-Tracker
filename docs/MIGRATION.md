# Office Automation Migration — Version 1.1

## Target

Move the legacy spreadsheet-centered Office Automation workflow to PostgreSQL. Google Spreadsheet must become read-only/archive and must not remain the production source of truth.

## Mapping baseline

| Legacy concept | PostgreSQL target |
|---|---|
| Employee/user | `User` |
| Telegram Chat ID | `UserTelegramIdentity.chatId` |
| Request | `OfficeRequest` |
| Operational task | `OfficeTask` |
| Approval | `OfficeApproval` |
| Request history | `OfficeActivityLog` |
| External notification | `IntegrationEvent` → n8n |

## Required discovery before production cutover

The actual legacy spreadsheet must be inventoried for:

- sheets and columns;
- data types;
- formulas and derived fields;
- employee identifiers;
- request/status values;
- approval relationships;
- historical records;
- attachments;
- notification rules;
- n8n dependencies.

## Migration procedure

1. Export the legacy spreadsheet to an immutable backup.
2. Inventory and normalize columns.
3. Map employee identities to existing `User` records.
4. Map Telegram Chat IDs to `UserTelegramIdentity`.
5. Transform request/task/approval records.
6. Import into PostgreSQL using a repeatable migration script.
7. Produce counts for `Imported`, `Skipped`, `Invalid`, `Duplicate`, and `Needs Review`.
8. Validate foreign keys, statuses, dates, approvals and identities.
9. Freeze the spreadsheet for production writes.
10. Switch the application to PostgreSQL-only operations.

## Current implementation state

The PostgreSQL target schema and application workflow are implemented. The actual legacy import is intentionally not fabricated: it requires the authoritative spreadsheet export/data source to execute and validate the migration counts.
