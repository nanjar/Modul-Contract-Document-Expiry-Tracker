# Office Automation Legacy Discovery — v1.1

## Source material

The legacy Office Automation implementation uses an n8n workflow named **HRD Entry Level** and a Google Spreadsheet workbook named **HRD Entry Level.xlsx**.

The `LeaveRequests` sheet contains:

- `index`
- `ChatId`
- `Name`
- `StartDate`
- `EndDate`
- `Reason`
- `Status`
- `RequestedAt`
- `Days`
- `AdminNotified`

The legacy workflow checks pending leave requests by `ChatId` and `Status=Pending`, writes request state back to Google Sheets, and sends Telegram messages. It also exposes a `myid` command that returns a user's Telegram Chat ID for employee registration.

## v1.1 migration decision

Google Sheets is a migration/reference source only. PostgreSQL becomes the production source of truth.

n8n remains the integration layer for Telegram.

## Initial domain mapping

| Legacy concept | v1.1 entity | Notes |
|---|---|---|
| Employee name / ChatId | `User` + `UserTelegramIdentity` | Employee identity comes from the platform user account. Telegram Chat ID is integration metadata. |
| LeaveRequests row | `OfficeRequest` | Request type = `LEAVE`. |
| StartDate / EndDate | `OfficeRequest.startDate`, `endDate` | Stored as dates. |
| Reason | `OfficeRequest.description` | Preserved as request description. |
| Status | `OfficeRequest.status` | Normalized to PENDING/APPROVED/REJECTED/CANCELLED. |
| RequestedAt | `OfficeRequest.createdAt` / `requestedAt` | Preserve original timestamp during migration. |
| Days | Derived value | Recomputed from start/end dates; legacy value can be retained in migration metadata if needed. |
| AdminNotified | Integration event state | Replaced by durable integration/outbox state. |
| Telegram notification | n8n + Telegram | No Telegram API call is part of core business logic. |

## Legacy workflow observations

The existing workflow performs Google Sheets lookups and updates directly. This is intentionally removed from the new production workflow.

The new flow is:

```text
Employee / Web App
       |
       v
    NestJS
       |
       +---- PostgreSQL transaction
       |
       +---- Integration event / outbox
                    |
                    v
                  n8n
                    |
                    v
                 Telegram
```

## Employee Telegram identity

The legacy `myid` flow asks the employee to send their Telegram Chat ID to HR. In v1.1 this becomes an authenticated user-to-Telegram binding process. The platform user remains the canonical employee identity.

The initial database model stores the Telegram Chat ID separately from `User` so Telegram remains an integration concern.

## Migration rules

1. Import legacy leave records before enabling production Office Automation workflows.
2. Map employee names/Chat IDs to existing platform users where possible.
3. Do not create duplicate platform accounts solely because a legacy row has a different name spelling.
4. Unmatched employees must be placed in a migration review queue/report.
5. Preserve original timestamps.
6. Normalize status values.
7. Recompute `Days` from dates and compare with the legacy value.
8. Do not migrate `AdminNotified` as a source-of-truth flag; create integration events based on the new notification requirements.
9. Keep the original spreadsheet read-only during validation.
10. Disable production writes to the spreadsheet after cutover.

## Required follow-up discovery

The remaining legacy n8n branches must be mapped before full Office Automation implementation, especially:

- Attendance/check-in/check-out.
- Employee directory.
- Leave request and approval.
- Broadcast announcements.
- Any other request/task/approval workflow present in the source workflow.

Only behavior directly supported by the legacy source should be migrated; new behavior should be explicitly identified as v1.1 product design.
