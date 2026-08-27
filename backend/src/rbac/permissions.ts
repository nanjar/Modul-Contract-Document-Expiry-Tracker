import { ModuleKey, Role } from '@prisma/client';

export const CONTRACT_DOCUMENT_PERMISSIONS = [
  'DOCUMENT_VIEW',
  'DOCUMENT_CREATE',
  'DOCUMENT_EDIT',
  'DOCUMENT_ARCHIVE',
  'DOCUMENT_FILE_UPLOAD',
  'DOCUMENT_FILE_DOWNLOAD',
  'DOCUMENT_REMINDER_MANAGE',
] as const;

export const OFFICE_AUTOMATION_PERMISSIONS = [
  'OFFICE_DASHBOARD_VIEW',
  'OFFICE_REQUEST_VIEW',
  'OFFICE_REQUEST_CREATE',
  'OFFICE_REQUEST_EDIT',
  'OFFICE_TASK_VIEW',
  'OFFICE_TASK_UPDATE',
  'OFFICE_TASK_ASSIGN',
  'OFFICE_APPROVAL_VIEW',
  'OFFICE_APPROVAL_ACTION',
  'OFFICE_REPORT_VIEW',
] as const;

// Internal compatibility permissions used by the current service implementation.
// They are not part of the public PRD permission matrix and are never granted by
// default to EDITOR/VIEWER accounts. They will be removed once the service layer
// is fully canonicalized.
const OFFICE_INTERNAL_COMPAT_PERMISSIONS = [
  'OFFICE_VIEW',
  'OFFICE_REQUEST_MANAGE',
  'OFFICE_TASK_MANAGE',
  'OFFICE_APPROVE',
] as const;

export const ALL_MODULE_PERMISSIONS = [
  ...CONTRACT_DOCUMENT_PERMISSIONS,
  ...OFFICE_AUTOMATION_PERMISSIONS,
  ...OFFICE_INTERNAL_COMPAT_PERMISSIONS,
] as const;

export type ModulePermission = (typeof ALL_MODULE_PERMISSIONS)[number];

const OFFICE_EDITOR_PERMISSIONS = [
  ...OFFICE_AUTOMATION_PERMISSIONS,
  ...OFFICE_INTERNAL_COMPAT_PERMISSIONS,
];

const OFFICE_VIEWER_PERMISSIONS = [
  'OFFICE_DASHBOARD_VIEW',
  'OFFICE_REQUEST_VIEW',
  'OFFICE_REQUEST_CREATE',
  'OFFICE_TASK_VIEW',
  'OFFICE_APPROVAL_VIEW',
  'OFFICE_REPORT_VIEW',
];

export const DEFAULT_MODULE_PERMISSIONS: Record<ModuleKey, Record<Role, readonly string[]>> = {
  CONTRACT_DOCUMENT: {
    SUPERUSER: CONTRACT_DOCUMENT_PERMISSIONS,
    EDITOR: CONTRACT_DOCUMENT_PERMISSIONS,
    VIEWER: ['DOCUMENT_VIEW', 'DOCUMENT_FILE_DOWNLOAD'],
  },
  OFFICE_AUTOMATION: {
    SUPERUSER: OFFICE_EDITOR_PERMISSIONS,
    EDITOR: OFFICE_EDITOR_PERMISSIONS,
    VIEWER: OFFICE_VIEWER_PERMISSIONS,
  },
};

export function defaultPermissions(module: ModuleKey, role: Role): string[] {
  return [...DEFAULT_MODULE_PERMISSIONS[module][role]];
}

export function isKnownModulePermission(permission: string): permission is ModulePermission {
  return (ALL_MODULE_PERMISSIONS as readonly string[]).includes(permission);
}

export function permissionsForRole(role: Role) {
  return {
    CONTRACT_DOCUMENT: defaultPermissions(ModuleKey.CONTRACT_DOCUMENT, role),
    OFFICE_AUTOMATION: defaultPermissions(ModuleKey.OFFICE_AUTOMATION, role),
  };
}
