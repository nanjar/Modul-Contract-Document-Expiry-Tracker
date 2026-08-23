import { Injectable, NotFoundException } from '@nestjs/common';
import { OfficeRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeRequestDto } from './dto/create-office-request.dto';

@Injectable()
export class OfficeAutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(requesterId?: string) {
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

  async findOne(id: string) {
    const request = await this.prisma.officeRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        approvals: true,
        tasks: true,
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!request) throw new NotFoundException('Office request not found');
    return request;
  }

  async create(dto: CreateOfficeRequestDto, requesterId: string) {
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
          title: dto.title,
          description: dto.description,
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
            status: request.status,
          },
        },
      });

      return request;
    });
  }

  async cancel(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.officeRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Office request not found');
      if (request.status !== OfficeRequestStatus.PENDING && request.status !== OfficeRequestStatus.APPROVED) {
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
}
