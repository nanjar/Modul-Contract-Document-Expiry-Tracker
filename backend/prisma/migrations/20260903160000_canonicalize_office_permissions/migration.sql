-- Canonicalize permissions used by Office Automation before the PRD v1.1
-- permission matrix was enforced. Preserve effective access while removing
-- deprecated compatibility permission names.

UPDATE "UserModuleAccess"
SET "permissions" = (
  SELECT ARRAY(
    SELECT DISTINCT permission
    FROM unnest(
      ARRAY_REMOVE(ARRAY_REMOVE(ARRAY_REMOVE(ARRAY_REMOVE("UserModuleAccess"."permissions",
        'OFFICE_VIEW'), 'OFFICE_REQUEST_MANAGE'), 'OFFICE_TASK_MANAGE'), 'OFFICE_APPROVE')
      || CASE WHEN 'OFFICE_VIEW' = ANY("UserModuleAccess"."permissions")
        THEN ARRAY['OFFICE_DASHBOARD_VIEW','OFFICE_REQUEST_VIEW','OFFICE_TASK_VIEW','OFFICE_APPROVAL_VIEW','OFFICE_REPORT_VIEW']::TEXT[]
        ELSE ARRAY[]::TEXT[] END
      || CASE WHEN 'OFFICE_REQUEST_MANAGE' = ANY("UserModuleAccess"."permissions")
        THEN ARRAY['OFFICE_REQUEST_EDIT']::TEXT[]
        ELSE ARRAY[]::TEXT[] END
      || CASE WHEN 'OFFICE_TASK_MANAGE' = ANY("UserModuleAccess"."permissions")
        THEN ARRAY['OFFICE_TASK_ASSIGN','OFFICE_TASK_UPDATE']::TEXT[]
        ELSE ARRAY[]::TEXT[] END
      || CASE WHEN 'OFFICE_APPROVE' = ANY("UserModuleAccess"."permissions")
        THEN ARRAY['OFFICE_APPROVAL_ACTION']::TEXT[]
        ELSE ARRAY[]::TEXT[] END
    ) AS permission
    ORDER BY permission
  )
)
WHERE "module" = 'OFFICE_AUTOMATION'
  AND (
    'OFFICE_VIEW' = ANY("permissions") OR
    'OFFICE_REQUEST_MANAGE' = ANY("permissions") OR
    'OFFICE_TASK_MANAGE' = ANY("permissions") OR
    'OFFICE_APPROVE' = ANY("permissions")
  );
