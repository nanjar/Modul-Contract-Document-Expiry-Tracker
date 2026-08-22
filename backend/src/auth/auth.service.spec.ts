jest.mock('argon2', () => ({ verify: jest.fn() }));
import * as argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

const verify = argon2.verify as jest.Mock;

describe('AuthService', () => {
  const prisma: any = { user: { findUnique: jest.fn() } };
  const jwt: any = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
  const service = new AuthService(prisma, jwt);
  const user = { id: 'u1', email: 'user@example.com', name: 'User', role: Role.EDITOR, isActive: true, passwordHash: 'hash' };

  beforeEach(() => jest.clearAllMocks());

  it('rejects unknown users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('USER@example.com', 'bad')).rejects.toThrow(UnauthorizedException);
  });
  it('rejects invalid passwords', async () => {
    prisma.user.findUnique.mockResolvedValue(user); verify.mockResolvedValue(false);
    await expect(service.login(user.email, 'bad')).rejects.toThrow(UnauthorizedException);
  });
  it('returns a JWT with the role claim for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(user); verify.mockResolvedValue(true);
    await expect(service.login(user.email, 'secret')).resolves.toEqual({ accessToken: 'jwt-token', user: { id: 'u1', email: user.email, name: user.name, role: Role.EDITOR } });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: user.email, role: Role.EDITOR });
  });
});
