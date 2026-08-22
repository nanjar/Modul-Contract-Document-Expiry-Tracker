import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';

function contextFor(user: any, required: Role[]) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const context: any = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
  return { guard, context };
}

describe('RolesGuard', () => {
  it('allows a required role', () => {
    const { guard, context } = contextFor({ role: Role.EDITOR }, [Role.SUPERUSER, Role.EDITOR]);
    expect(guard.canActivate(context)).toBe(true);
  });
  it('denies a non-required role', () => {
    const { guard, context } = contextFor({ role: Role.VIEWER }, [Role.SUPERUSER, Role.EDITOR]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
  it('allows routes without role metadata', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context: any = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({}) }) };
    expect(guard.canActivate(context)).toBe(true);
  });
});
