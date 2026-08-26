import { ForbiddenException } from '@nestjs/common';
import { ModuleKey, Role } from '@prisma/client';
import { ModuleAccessGuard } from './module-access.guard';

function context(metadata: any, userId = 'u1') {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: userId } }) }),
    metadata,
  } as any;
}

describe('ModuleAccessGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as any;
  const prisma = {
    user: { findUnique: jest.fn() },
  } as any;

  const guard = new ModuleAccessGuard(reflector, prisma);

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without module metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(context(undefined))).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows superusers regardless of module rows', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: ModuleKey.CONTRACT_DOCUMENT, permission: 'DOCUMENT_EDIT' });
    prisma.user.findUnique.mockResolvedValue({ role: Role.SUPERUSER, isActive: true, moduleAccess: [] });
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
  });

  it('denies users without module access', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: ModuleKey.CONTRACT_DOCUMENT, permission: 'DOCUMENT_VIEW' });
    prisma.user.findUnique.mockResolvedValue({ role: Role.VIEWER, isActive: true, moduleAccess: [] });
    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies users without the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: ModuleKey.OFFICE_AUTOMATION, permission: 'OFFICE_APPROVAL_ACTION' });
    prisma.user.findUnique.mockResolvedValue({ role: Role.EDITOR, isActive: true, moduleAccess: [{ permissions: ['OFFICE_REQUEST_VIEW'] }] });
    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows users with the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue({ module: ModuleKey.OFFICE_AUTOMATION, permission: 'OFFICE_REQUEST_CREATE' });
    prisma.user.findUnique.mockResolvedValue({ role: Role.VIEWER, isActive: true, moduleAccess: [{ permissions: ['OFFICE_REQUEST_CREATE'] }] });
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
  });
});
