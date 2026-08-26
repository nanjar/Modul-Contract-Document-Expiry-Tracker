-- Preserve the access existing users already had before module-level access became explicit.
-- SUPERUSER keeps full access. EDITOR keeps full operational access. VIEWER keeps read-oriented access.

INSERT INTO "UserModuleAccess" ("id", "userId", "module", "permissions", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."id",
  'CONTRACT_DOCUMENT'::"ModuleKey",
  CASE u."role"
    WHEN 'SUPERUSER'::"Role" THEN ARRAY[
      'DOCUMENT_VIEW', 'DOCUMENT_CREATE', 'DOCUMENT_EDIT', 'DOCUMENT_ARCHIVE',
      'DOCUMENT_FILE_UPLOAD', 'DOCUMENT_FILE_DOWNLOAD', 'DOCUMENT_REMINDER_MANAGE'
    ]::TEXT[]
    WHEN 'EDITOR'::"Role" THEN ARRAY[
      'DOCUMENT_VIEW', 'DOCUMENT_CREATE', 'DOCUMENT_EDIT', 'DOCUMENT_ARCHIVE',
      'DOCUMENT_FILE_UPLOAD', 'DOCUMENT_FILE_DOWNLOAD', 'DOCUMENT_REMINDER_MANAGE'
    ]::TEXT[]
    ELSE ARRAY['DOCUMENT_VIEW', 'DOCUMENT_FILE_DOWNLOAD']::TEXT[]
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1
  FROM "UserModuleAccess" a
  WHERE a."userId" = u."id"
    AND a."module" = 'CONTRACT_DOCUMENT'::"ModuleKey"
);

INSERT INTO "UserModuleAccess" ("id", "userId", "module", "permissions", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."id",
  'OFFICE_AUTOMATION'::"ModuleKey",
  CASE u."role"
    WHEN 'SUPERUSER'::"Role" THEN ARRAY[
      'OFFICE_DASHBOARD_VIEW', 'OFFICE_REQUEST_VIEW', 'OFFICE_REQUEST_CREATE',
      'OFFICE_REQUEST_EDIT', 'OFFICE_TASK_VIEW', 'OFFICE_TASK_UPDATE',
      'OFFICE_TASK_ASSIGN', 'OFFICE_APPROVAL_VIEW', 'OFFICE_APPROVAL_ACTION',
      'OFFICE_REPORT_VIEW'
    ]::TEXT[]
    WHEN 'EDITOR'::"Role" THEN ARRAY[
      'OFFICE_DASHBOARD_VIEW', 'OFFICE_REQUEST_VIEW', 'OFFICE_REQUEST_CREATE',
      'OFFICE_REQUEST_EDIT', 'OFFICE_TASK_VIEW', 'OFFICE_TASK_UPDATE',
      'OFFICE_TASK_ASSIGN', 'OFFICE_APPROVAL_VIEW', 'OFFICE_APPROVAL_ACTION',
      'OFFICE_REPORT_VIEW'
    ]::TEXT[]
    ELSE ARRAY[
      'OFFICE_DASHBOARD_VIEW', 'OFFICE_REQUEST_VIEW', 'OFFICE_REQUEST_CREATE',
      'OFFICE_TASK_VIEW', 'OFFICE_TASK_UPDATE', 'OFFICE_APPROVAL_VIEW'
    ]::TEXT[]
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1
  FROM "UserModuleAccess" a
  WHERE a."userId" = u."id"
    AND a."module" = 'OFFICE_AUTOMATION'::"ModuleKey"
);
