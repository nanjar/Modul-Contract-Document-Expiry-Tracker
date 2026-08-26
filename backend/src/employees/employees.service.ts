import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const employeeSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  employeeNumber: true,
  department: true,
  position: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
  manager: { select: { id: true, name: true, employeeNumber: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const items = await this.prisma.user.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: employeeSelect,
    });
    return { items };
  }

  async findOne(id: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...employeeSelect,
        reports: { select: { id: true, name: true, employeeNumber: true, position: true, isActive: true }, orderBy: { name: 'asc' } },
        moduleAccess: true,
        telegramIdentities: { select: { chatId: true, username: true, isVerified: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async me(id: string) {
    return this.findOne(id);
  }

  async create(input: {
    email: string;
    name: string;
    password: string;
    role: Role;
    employeeNumber?: string;
    department?: string;
    position?: string;
    managerId?: string;
    actorId: string;
  }) {
    const email = input.email.toLowerCase().trim();
    const employeeNumber = input.employeeNumber?.trim() || undefined;

    const existingEmail = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingEmail) throw new ConflictException('Email is already registered');

    if (employeeNumber) {
      const existingNumber = await this.prisma.user.findUnique({ where: { employeeNumber }, select: { id: true } });
      if (existingNumber) throw new ConflictException('Employee number is already registered');
    }

    await this.validateManager(input.managerId);
    const passwordHash = await argon2.hash(input.password);

    try {
      const employee = await this.prisma.user.create({
        data: {
          email,
          name: input.name.trim(),
          passwordHash,
          role: input.role,
          employeeNumber,
          department: input.department?.trim() || undefined,
          position: input.position?.trim() || undefined,
          managerId: input.managerId || undefined,
        },
        select: employeeSelect,
      });

      await this.audit.log({
        actorId: input.actorId,
        action: 'CREATE',
        entity: 'Employee',
        entityId: employee.id,
        metadata: { email: employee.email, employeeNumber: employee.employeeNumber, role: employee.role },
      });

      return employee;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Employee email or employee number is already registered');
      }
      throw error;
    }
  }

  async update(id: string, input: {
    name?: string;
    password?: string;
    role?: Role;
    employeeNumber?: string;
    department?: string;
    position?: string;
    managerId?: string | null;
    isActive?: boolean;
  }, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');

    if (existing.id === actorId && input.isActive === false) {
      throw new ConflictException('You cannot deactivate your own account');
    }

    if (existing.id === actorId && input.role !== undefined && input.role !== existing.role) {
      throw new ConflictException('You cannot change your own role');
    }

    if (input.managerId === id) throw new ConflictException('An employee cannot be their own manager');
    await this.validateManager(input.managerId ?? undefined);

    if (input.employeeNumber !== undefined && input.employeeNumber !== existing.employeeNumber) {
      const number = input.employeeNumber.trim();
      if (number) {
        const duplicate = await this.prisma.user.findFirst({ where: { employeeNumber: number, NOT: { id } }, select: { id: true } });
        if (duplicate) throw new ConflictException('Employee number is already registered');
      }
    }

    const passwordHash = input.password ? await argon2.hash(input.password) : undefined;
    const employee = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.employeeNumber !== undefined ? { employeeNumber: input.employeeNumber.trim() || null } : {}),
        ...(input.department !== undefined ? { department: input.department.trim() || null } : {}),
        ...(input.position !== undefined ? { position: input.position.trim() || null } : {}),
        ...(input.managerId !== undefined ? { managerId: input.managerId || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
      select: employeeSelect,
    });

    await this.audit.log({
      actorId,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: employee.id,
      metadata: {
        previous: { employeeNumber: existing.employeeNumber, department: existing.department, position: existing.position, managerId: existing.managerId, role: existing.role, isActive: existing.isActive },
        current: { employeeNumber: employee.employeeNumber, department: employee.department, position: employee.position, managerId: employee.managerId, role: employee.role, isActive: employee.isActive },
      },
    });

    return employee;
  }

  async deactivate(id: string, actorId: string) {
    return this.update(id, { isActive: false }, actorId);
  }

  private async validateManager(managerId?: string) {
    if (!managerId) return;
    const manager = await this.prisma.user.findUnique({ where: { id: managerId }, select: { id: true, isActive: true } });
    if (!manager) throw new NotFoundException('Manager not found');
    if (!manager.isActive) throw new ConflictException('Manager must be active');
  }
}
