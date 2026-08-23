# Office Automation Legacy Mapping — v1.1

## Purpose

This document records the reverse-engineering of the legacy Office Automation implementation before production cutover. The legacy implementation uses Google Sheets as operational state/data storage and n8n as the Telegram interaction/orchestration layer. The v1.1 target moves system-of-record responsibilities to PostgreSQL/NestJS while retaining n8n for Telegram and external integrations.

## Legacy capabilities identified

The source workflow and workbook show these functional areas:

1. Employee directory and Telegram identity registration.
2. Attendance check-in/check-out with location capture and reverse geocoding.
3. Pending attendance session state while waiting for Telegram location.
4. Leave/cuti requests with pending-state protection and HR notification.
5. Late-arrival requests.
6. Overtime requests.
7. WFH requests.
8. Reimbursement requests, including receipt URL.
9. Business-trip requests.
10. Meeting-room bookings.
11. HR directory search.
12. HR announcements, targeted broadcast, and read receipts.
13. Telegram menu, callback handling, registration checks, and fallback messages.

## Evidence from legacy source

The `MTP Office Automation` workflow is active in the n8n instance and uses Telegram as its trigger. Its node graph includes `Check Existing Attendance`, `Save Pending Session`, and `Get Pending Session`, all implemented with Google Sheets nodes. The pending session is then used to request location and append the attendance record after reverse geocoding.

The `HRD Entry Level` workbook contains operational sheets including `Employees`, `Attendance`, `ReadReceipts`, `MeetingBookings`, `OvertimeRequests`, `LateRequests`, and `ReimbursementRequests`. The source also contains Business Trip request data and an HR dashboard derived from the operational sheets.

## Target ownership model

| Concern | Legacy | v1.1 target |
|---|---|---|
| Employee identity | Employees sheet | `User` + profile/module access |
| Telegram identity | `ChatId` in Sheets | `UserTelegramIdentity` |
| Attendance | Attendance sheet | PostgreSQL attendance records |
| Pending Telegram state | Sessions/HR state Sheets | PostgreSQL pending interaction state |
| Leave | LeaveRequests / Attendance action | PostgreSQL office request + typed metadata / dedicated request model |
| Late | LateRequests | PostgreSQL office request + typed metadata / dedicated request model |
| Overtime | OvertimeRequests | PostgreSQL office request + typed metadata / dedicated request model |
| WFH | WFH request flow | PostgreSQL office request + typed metadata / dedicated request model |
| Reimbursement | ReimbursementRequests | PostgreSQL office request + receipt/storage reference |
| Business trip | BusinessTripRequests | PostgreSQL office request + trip fields |
| Meeting booking | MeetingBookings | PostgreSQL booking/room model |
| Announcements | announcement sheet | PostgreSQL announcement model |
| Read receipts | ReadReceipts | PostgreSQL announcement receipt model |
| Business rules | n8n Code/IF nodes | NestJS services/use-cases |
| Telegram interaction | n8n | n8n |
| External notifications | n8n | n8n |
| Reporting | spreadsheet dashboard | Next.js + PostgreSQL queries |

## Important migration rule

Do not reproduce every legacy spreadsheet as a one-to-one table. The workbook is an implementation artifact, not the target domain model. Request types that share lifecycle/approval/audit behavior should use common domain primitives, while high-volume or structurally distinct domains such as attendance, meeting rooms, announcements, and read receipts should receive dedicated relational models.

## Proposed PostgreSQL domain additions

The existing v1.1 schema already contains `User`, `UserModuleAccess`, `UserTelegramIdentity`, `OfficeRequest`, `OfficeTask`, `OfficeApproval`, `OfficeActivityLog`, and `IntegrationEvent`.

The next schema increment should add dedicated models for:

- `AttendanceRecord`
- `OfficeInteractionState` (or equivalent pending-session/state table)
- `Announcement`
- `AnnouncementRecipient` / `AnnouncementReadReceipt`
- `MeetingRoom`
- `MeetingBooking`
- `LeaveBalance` / employee leave policy representation

Request-specific structured fields should be normalized where they participate in filtering, validation, reporting, or approval rules. `metadata` may be retained for forward-compatible integration payloads, not as the primary storage for core business fields.

## Telegram identity rule

`ChatId` is an integration identifier, not the platform user identity. A Telegram identity must reference the already registered platform `User`. Existing SUPERUSER, EDITOR, and VIEWER users must not create a second employee account merely to use Telegram Office Automation.

## Cutover strategy

1. Freeze legacy workflow changes except urgent production fixes.
2. Snapshot legacy Sheets and export workflow JSON for audit/rollback.
3. Create PostgreSQL schema and migration scripts.
4. Import legacy data with deterministic source references and validation reports.
5. Implement NestJS business services and authenticated APIs.
6. Create a new n8n workflow for v1.1; keep the current `MTP Office Automation` workflow active during parallel testing.
7. Route new events through PostgreSQL/NestJS while n8n handles Telegram delivery.
8. Validate attendance, requests, approvals, announcements, and read receipts against legacy behavior.
9. Perform controlled cutover and keep the legacy workflow disabled-but-preserved for rollback.
10. Archive the legacy Google Sheets as historical evidence; do not use them as production state after cutover.

## Current production workflow reference

- Workflow: `MTP Office Automation`
- n8n workflow ID: `d9ZBFW1xlgNCE2ZF`
- Current state: active
- Action: preserve; do not modify during discovery/migration

## Acceptance criteria for the migration phase

- No production transaction depends on Google Sheets after cutover.
- Every Telegram employee identity maps to an existing platform `User`.
- Duplicate pending requests follow deterministic business rules.
- Attendance location and timestamp data are preserved.
- Approval and audit history are retained.
- Announcement delivery/read status is queryable from PostgreSQL.
- n8n failure does not roll back a successful business transaction; integration events are retryable/idempotent.
- Legacy data can be reconciled against PostgreSQL with a documented count and exception report.
