import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const OFFICE = ModuleKey.OFFICE_AUTOMATION;
const VIEW = 'OFFICE_VIEW';
const APPROVE = 'OFFICE_APPROVE';

@Injectable()
export class OfficeAutomationQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async approvals(actorId: string, all = false) {
    await this.users.assertModuleAccess(actorId, OFFICE, VIEW);
    const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    const canViewAll = user?.role === 'SUPERUSER' || user?.role === 'EDITOR';
    return this.prisma.officeApproval.findMany({
      where: canViewAll && all ? undefined : { approverId: actorId },
      include: {
        request: { select: { id: true, requestNumber: true, title: true, type: true, priority: true, status: true, requiredDate: true, requester: { select: { id: true, name: true, email: true } } } },
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async task(id: string, actorId: string) {
    await this.users.assertModuleAccess(actorId, OFFICE, VIEW);
    const task = await this.prisma.officeTask.findUnique({
      where: { id },
      include: {
        request: { select: { id: true, requestNumber: true, title: true, type: true, priority: true, status: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!task) throw new NotFoundException('Office task not found');
    const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (user?.role !== 'SUPERUSER' && user?.role !== 'EDITOR' && task.assigneeId !== actorId) {
      throw new ForbiddenException('You can only view your own office tasks');
    }
    return task;
  }

  async usersForOffice(actorId: string) {
    await this.users.assertModuleAccess(actorId, OFFICE, VIEW);
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async report(actorId: string) {
    await this.users.assertModuleAccess(actorId, OFFICE, VIEW);
    const [requests, tasks, approvals, activeUsers] = await Promise.all([
      this.prisma.officeRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.officeTask.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.officeApproval.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.officeTask.groupBy({ by: ['assigneeId'], where: { assigneeId: { not: null }, status: { not: 'COMPLETED' } }, _count: { _all: true }, orderBy: { _count: { assigneeId: 'desc' } }, take: 10 }),
    ]);

    const userIds = activeUsers.map((item) => item.assigneeId).filter((id): id is string => Boolean(id));
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    const countBy = (items: Array<{ status: string; _count: { _all: number } }>) => Object.fromEntries(items.map((item) => [item.status, item._count._all]));

    return {
      requests: countBy(requests),
      tasks: countBy(tasks),
      approvals: countBy(approvals),
      workload: activeUsers.map((item) => ({ assignee: item.assigneeId ? userMap.get(item.assigneeId) ?? null : null, openTasks: item._count._all })),
      generatedAt: new Date().toISOString(),
    };
  }

  async assertCanApprove(actorId: string) {
    await this.users.assertModuleAccess(actorId, OFFICE, APPROVE);
    return true;
  }
}
