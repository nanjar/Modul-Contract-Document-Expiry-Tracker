import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true } }); }
  async create(input: { email: string; name: string; password: string; role?: Role }) { const passwordHash = await argon2.hash(input.password); return this.prisma.user.create({ data: { email: input.email.toLowerCase(), name: input.name, passwordHash, role: input.role ?? Role.VIEWER }, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } }); }
  async update(id: string, input: { name?: string; role?: Role; isActive?: boolean }) { const existing = await this.prisma.user.findUnique({ where: { id } }); if (!existing) throw new NotFoundException('User not found'); return this.prisma.user.update({ where: { id }, data: { name: input.name, role: input.role, isActive: input.isActive }, select: { id: true, email: true, name: true, role: true, isActive: true, updatedAt: true } }); }
}
