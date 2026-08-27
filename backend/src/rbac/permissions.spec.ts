import { ModuleKey, Role } from '@prisma/client';
import {
  CONTRACT_DOCUMENT_PERMISSIONS,
  DEFAULT_MODULE_PERMISSIONS,
  OFFICE_AUTOMATION_PERMISSIONS,
  defaultPermissions,
  isKnownModulePermission,
} from './permissions';

describe('PRD 1.1 module permission matrix', () => {
  it('keeps the canonical Contract & Document permissions intact', () => {
    expect(defaultPermissions(ModuleKey.CONTRACT_DOCUMENT, Role.SUPERUSER)).toEqual(
      expect.arrayContaining([...CONTRACT_DOCUMENT_PERMISSIONS]),
    );
    expect(defaultPermissions(ModuleKey.CONTRACT_DOCUMENT, Role.EDITOR)).toEqual(
      expect.arrayContaining([...CONTRACT_DOCUMENT_PERMISSIONS]),
    );
    expect(defaultPermissions(ModuleKey.CONTRACT_DOCUMENT, Role.VIEWER)).toEqual([
      'DOCUMENT_VIEW',
      'DOCUMENT_FILE_DOWNLOAD',
    ]);
  });

  it('grants Office mutation capabilities only to privileged roles by default', () => {
    const editor = defaultPermissions(ModuleKey.OFFICE_AUTOMATION, Role.EDITOR);
    const viewer = defaultPermissions(ModuleKey.OFFICE_AUTOMATION, Role.VIEWER);

    for (const permission of OFFICE_AUTOMATION_PERMISSIONS) {
      expect(editor).toContain(permission);
    }

    expect(viewer).toContain('OFFICE_REQUEST_VIEW');
    expect(viewer).toContain('OFFICE_REQUEST_CREATE');
    expect(viewer).not.toContain('OFFICE_REQUEST_EDIT');
    expect(viewer).not.toContain('OFFICE_TASK_UPDATE');
    expect(viewer).not.toContain('OFFICE_TASK_ASSIGN');
    expect(viewer).not.toContain('OFFICE_APPROVAL_ACTION');
  });

  it('keeps permission validation closed over known module permissions', () => {
    for (const permission of CONTRACT_DOCUMENT_PERMISSIONS) {
      expect(isKnownModulePermission(permission)).toBe(true);
    }
    for (const permission of OFFICE_AUTOMATION_PERMISSIONS) {
      expect(isKnownModulePermission(permission)).toBe(true);
    }
    expect(isKnownModulePermission('ROOT_DATABASE_ACCESS')).toBe(false);
  });

  it('defines a permission set for every supported role/module pair', () => {
    for (const module of Object.values(ModuleKey)) {
      for (const role of Object.values(Role)) {
        expect(DEFAULT_MODULE_PERMISSIONS[module][role]).toBeDefined();
      }
    }
  });
});
