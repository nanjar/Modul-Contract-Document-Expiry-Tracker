import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleKey, OfficeRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOfficeApprovalDto } from './dto/create-office-approval.dto';
import { CreateOfficeRequestDto } from './dto/create-office-request.dto';
import { CreateOfficeTaskDto } from './dto/create-office-task.dto';
import { DecideOfficeApprovalDto } from './dto/decide-office-approval.dto';
import { UpdateOfficeRequestDto } from './dto/update-office-request.dto';
import { UpdateOfficeTaskDto } from './dto/update-office-task.dto';

const OFFICE = ModuleKey.OFFICE_AUTOMATION;
const PERMISSIONS = {
  VIEW: 'OFFICE_VIEW',
  CREATE: 'OFFICE_REQUEST_CREATE',
  MANAGE: 'OFFICE_REQUEST_MANAGE',
  TASK: 'OFFICE_TASK_MANAGE',
  APPROVE: 'OFFICE_APPROVE',
} as const;

@Injectable()
export class OfficeAutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(requesterId?: string, actorId?: string) {
    if (actorId) await this.assertAccess(actorId, PERMISSIONS.VIEW);

    return this.prisma.officeRequest.findMany({
      where: requesterId ? { requesterId } : undefined,
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        approvals: true,
        tasks: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findOne(id: string, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.VIEW);
    const request = await this.prisma.officeRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        approvals: { include: { approver: { select: { id: true, name: true, email: true } } } },
        tasks: { include: { assignee: { select: { id: true, name: true, email: true } } } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!request) throw new NotFoundException('Office request not found');
    if (requesterIdBoundary(request.requesterId, actorId) === false) {
      const access = await this.prisma.userModuleAccess.findUnique({
        where: { userId_module: { userId: actorId, module: OFFICE } },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true },
      });
      if (user?.role !== 'SUPERUSER' && !access?.permissions.includes(PERMISSIONS.MANAGE)) {
        throw new ForbiddenException('You can only view your own office requests');
      }
    }
    return request;
  }

  async create(dto: CreateOfficeRequestDto, requesterId: string) {
    await this.assertAccess(requesterId, PERMISSIONS.CREATE);
    const requestNumber = `OFF-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    const requiredDate = dto.requiredDate ? new Date(dto.requiredDate) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.officeRequest.create({
        data: {
          requestNumber,
          type: dto.type,
          requesterId,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          startDate,
          endDate,
          requiredDate,
          priority: dto.priority || 'NORMAL',
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      await tx.officeActivityLog.create({
        data: {
          requestId: request.id,
          actorId: requesterId,
          action: 'REQUEST_CREATED',
          metadata: { requestNumber, type: dto.type },
        },
      });

      await tx.integrationEvent.create({
        data: {
          event: 'OFFICE_REQUEST_CREATED',
          entityId: request.id,
          idempotencyKey: `office-request-created:${request.id}`,
          payload: {
            requestId: request.id,
            requestNumber: request.requestNumber,
            type: request.type,
            requesterId,
            title: request.title,
            description: request.description,
            requiredDate: request.requiredDate,
            priority: request.priority,
            status: request.status,
          },
        },
      });

      return request;
    });
  }

  async update(id: string, dto: UpdateOfficeRequestDto, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.MANAGE);
    const existing = await this.getRequestOrThrow(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.officeRequest.update({
        where: { id },
        data: {
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
          ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
          ...(dto.requiredDate !== undefined ? { requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
        },
      });

      await tx.officeActivityLog.create({
        data: {
          requestId: id,
          actorId,
          action: 'REQUEST_UPDATED',
          metadata: { previousStatus: existing.status, currentStatus: request.status },
        },
      });

      await tx.integrationEvent.create({
        data: {
          event: 'OFFICE_REQUEST_UPDATED',
          entityId: id,
          idempotencyKey: `office-request-updated:${id}:${request.updatedAt.getTime()}`,
          payload: { requestId: id, requestNumber: request.requestNumber, actorId, status: request.status },
        },
      });

      return request;
    });

    return updated;
  }

  async cancel(id: string, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.MANAGE);
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.officeRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Office request not found');
      if (request.requesterId !== actorId) {
        const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
        if (user?.role !== 'SUPERUSER') throw new ForbiddenException('Only the requester or superuser can cancel this request');
      }
      if (
        request.status !== OfficeRequestStatus.PENDING &&
        request.status !== OfficeRequestStatus.APPROVED
      ) {
        return request;
      }

      const updated = await tx.officeRequest.update({
        where: { id },
        data: { status: OfficeRequestStatus.CANCELLED, cancelledAt: new Date() },
      });

      await tx.officeActivityLog.create({
        data: { requestId: id, actorId, action: 'REQUEST_CANCELLED' },
      });

      await tx.integrationEvent.create({
        data: {
          event: 'OFFICE_REQUEST_CANCELLED',
          entityId: id,
          idempotencyKey: `office-request-cancelled:${id}:${updated.updatedAt.getTime()}`,
          payload: { requestId: id, requestNumber: updated.requestNumber, actorId },
        },
      });

      return updated;
    });
  }

  async listTasks(actorId: string, assigneeId?: string) {
    await this.assertAccess(actorId, PERMISSIONS.VIEW);
    return this.prisma.officeTask.findMany({
      where: assigneeId ? { assigneeId } : undefined,
      include: { request: true, assignee: { select: { id: true, name: true, email: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createTask(requestId: string, dto: CreateOfficeTaskDto, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.TASK);
    await this.getRequestOrThrow(requestId);
    if (dto.assigneeId) await this.assertUserExists(dto.assigneeId);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.officeTask.create({
        data: {
          requestId,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          assigneeId: dto.assigneeId,
          priority: dto.priority || 'NORMAL',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });
      await tx.officeActivityLog.create({
        data: { requestId, actorId, action: 'TASK_CREATED', metadata: { taskId: created.id } },
      });
      await tx.integrationEvent.create({
        data: {
          event: 'OFFICE_TASK_ASSIGNED',
          entityId: created.id,
          idempotencyKey: `office-task-assigned:${created.id}:${created.updatedAt.getTime()}`,
          payload: { taskId: created.id, requestId, assigneeId: created.assigneeId, actorId },
        },
      });
      return created;
    });
    return task;
  }

  async updateTask(id: string, dto: UpdateOfficeTaskDto, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.TASK);
    const existing = await this.prisma.officeTask.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Office task not found');
    if (dto.assigneeId) await this.assertUserExists(dto.assigneeId);

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.officeTask.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.status !== undefined ? { status: dto.status, completedAt: dto.status === 'COMPLETED' ? new Date() : null } : {}),
          ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        },
      });
      await tx.officeActivityLog.create({
        data: { requestId: task.requestId, actorId, action: 'TASK_UPDATED', metadata: { taskId: id } },
      });
      return task;
    });
  }

  async createApproval(requestId: string, dto: CreateOfficeApprovalDto, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.MANAGE);
    await this.getRequestOrThrow(requestId);
    await this.assertUserExists(dto.approverId);

    return this.prisma.$transaction(async (tx) => {
      const approval = await tx.officeApproval.create({
        data: { requestId, approverId: dto.approverId },
      });
      await tx.officeActivityLog.create({
        data: { requestId, actorId, action: 'APPROVAL_CREATED', metadata: { approvalId: approval.id, approverId: dto.approverId } },
      });
      await tx.integrationEvent.create({
        data: {
          event: 'OFFICE_APPROVAL_REQUIRED',
          entityId: approval.id,
          idempotencyKey: `office-approval-required:${approval.id}`,
          payload: { approvalId: approval.id, requestId, approverId: dto.approverId, actorId },
        },
      });
      return approval;
    });
  }

  async decideApproval(id: string, dto: DecideOfficeApprovalDto, actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.APPROVE);
    const approval = await this.prisma.officeApproval.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException('Office approval not found');
    if (approval.approverId !== actorId) throw new ForbiddenException('Only the assigned approver can decide this approval');
    if (approval.status !== OfficeRequestStatus.PENDING) return approval;

    return this.prisma.$transaction(async (tx) => {
      const decided = await tx.officeApproval.update({
        where: { id },
        data: { status: dto.status as OfficeRequestStatus, comment: dto.comment?.trim(), decidedAt: new Date() },
      });

      const requestStatus = dto.status === 'APPROVED' ? OfficeRequestStatus.APPROVED : OfficeRequestStatus.REJECTED;
      await tx.officeRequest.update({ where: { id: approval.requestId }, data: { status: requestStatus } });
      await tx.officeActivityLog.create({
        data: {
          requestId: approval.requestId,
          actorId,
          action: `REQUEST_${dto.status}`,
          metadata: { approvalId: id, comment: dto.comment },
        },
      });
      await tx.integrationEvent.create({
        data: {
          event: dto.status === 'APPROVED' ? 'OFFICE_REQUEST_APPROVED' : 'OFFICE_REQUEST_REJECTED',
          entityId: approval.requestId,
          idempotencyKey: `office-request-${dto.status.toLowerCase()}:${approval.requestId}:${decided.updatedAt.getTime()}`,
          payload: { requestId: approval.requestId, approvalId: id, actorId, comment: dto.comment },
        },
      });
      return decided;
    });
  }

  async dashboard(actorId: string) {
    await this.assertAccess(actorId, PERMISSIONS.VIEW);

    const [
      pendingRequests,
      pendingApprovals,
      openTasks,
      overdueTasks,
      myRequests,
      myTasks,
      totalRequests,
      completedRequests,
      integrationPending,
      integrationProcessing,
      integrationFailed,
      integrationDelivered,
      recentActivity,
      recentIntegrations,
    ] = await Promise.all([
      this.prisma.officeRequest.count({ where: { status: OfficeRequestStatus.PENDING } }),
      this.prisma.officeApproval.count({ where: { approverId: actorId, status: OfficeRequestStatus.PENDING } }),
      this.prisma.officeTask.count({ where: { status: { not: 'COMPLETED' } } }),
      this.prisma.officeTask.count({ where: { status: { not: 'COMPLETED' }, dueDate: { lt: new Date() } } }),
      this.prisma.officeRequest.count({ where: { requesterId: actorId, status: { in: [OfficeRequestStatus.PENDING, OfficeRequestStatus.APPROVED, OfficeRequestStatus.IN_PROGRESS] } } }),
      this.prisma.officeTask.count({ where: { assigneeId: actorId, status: { not: 'COMPLETED' } } }),
      this.prisma.officeRequest.count(),
      this.prisma.officeRequest.count({ where: { status: OfficeRequestStatus.COMPLETED } }),
      this.prisma.integrationEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.integrationEvent.count({ where: { status: 'PROCESSING' } }),
      this.prisma.integrationEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.integrationEvent.count({ where: { status: 'DELIVERED' } }),
      this.prisma.officeActivityLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { request: { select: { id: true, requestNumber: true, title: true, status: true } } },
      }),
      this.prisma.integrationEvent.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { id: true, event: true, status: true, attempts: true, lastError: true, createdAt: true, processedAt: true },
      }),
    ]);

    return {
      pendingRequests,
      pendingApprovals,
      openTasks,
      overdueTasks,
      myRequests,
      myTasks,
      totalRequests,
      completedRequests,
      completionRate: totalRequests ? Math.round((completedRequests / totalRequests) * 100) : 0,
      integration: {
        pending: integrationPending,
        processing: integrationProcessing,
        failed: integrationFailed,
        delivered: integrationDelivered,
        healthy: integrationFailed === 0,
      },
      recentActivity,
      recentIntegrations,
    };
  }

  private async assertAccess(userId: string, permission: string) {
    await this.users.assertModuleAccess(userId, OFFICE, permission);
  }

  private async getRequestOrThrow(id: string) {
    const request = await this.prisma.officeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Office request not found');
    return request;
  }

  private async assertUserExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) throw new NotFoundException('Active user not found');
  }
}

function requesterIdBoundary(requesterId: string, actorId: string) {
  return requesterId === actorId;
}
