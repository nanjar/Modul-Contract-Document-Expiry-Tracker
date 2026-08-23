import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('User account is not available');
    return user;
  }

  async update(id: string, input: { name?: string; email?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || !existing.isActive) throw new UnauthorizedException('User account is not available');

    const email = input.email?.toLowerCase().trim();
    if (email && email !== existing.email) {
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate) throw new ConflictException('Email is already registered');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(email !== undefined ? { email } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });

    await this.audit.log({ actorId: id, action: 'UPDATE', entity: 'User', entityId: id, metadata: { profile: true } });
    return this.withToken(user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) throw new UnauthorizedException('User account is not available');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await argon2.hash(newPassword);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });

    await this.audit.log({ actorId: id, action: 'UPDATE', entity: 'User', entityId: id, metadata: { passwordChanged: true } });
    return this.withToken(updated);
  }

  private async withToken(user: { id: string; email: string; name: string; role: any }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { accessToken, user };
  }
}
