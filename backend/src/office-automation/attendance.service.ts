import { BadRequestException, Injectable } from '@nestjs/common';
import { AttendanceAction, AttendanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async today(userId: string) {
    const day = this.startOfDay(new Date());
    return this.prisma.attendanceRecord.findUnique({ where: { userId_attendanceDate: { userId, attendanceDate: day } }, include: { actions: { orderBy: { createdAt: 'asc' } } } });
  }

  async history(userId: string, from?: string, to?: string) {
    const where: Prisma.AttendanceRecordWhereInput = { userId };
    if (from || to) where.attendanceDate = { ...(from ? { gte: this.startOfDay(new Date(from)) } : {}), ...(to ? { lte: this.startOfDay(new Date(to)) } : {}) };
    return this.prisma.attendanceRecord.findMany({ where, include: { actions: { orderBy: { createdAt: 'asc' } } }, orderBy: { attendanceDate: 'desc' }, take: 100 });
  }

  async action(userId: string, input: { action: AttendanceAction; latitude?: number; longitude?: number }) {
    const day = this.startOfDay(new Date());
    const now = new Date();
    return this.prisma.$transaction(async tx => {
      let record = await tx.attendanceRecord.findUnique({ where: { userId_attendanceDate: { userId, attendanceDate: day } } });
      if (input.action === AttendanceAction.CHECK_IN) {
        if (record?.checkInAt) throw new BadRequestException('Already checked in today');
        record = record ? await tx.attendanceRecord.update({ where: { id: record.id }, data: { checkInAt: now, status: AttendanceStatus.PRESENT, checkInLat: input.latitude, checkInLng: input.longitude } }) : await tx.attendanceRecord.create({ data: { userId, attendanceDate: day, status: AttendanceStatus.PRESENT, checkInAt: now, checkInLat: input.latitude, checkInLng: input.longitude } });
      } else {
        if (!record?.checkInAt) throw new BadRequestException('Check in before checking out');
        if (record.checkOutAt) throw new BadRequestException('Already checked out today');
        record = await tx.attendanceRecord.update({ where: { id: record.id }, data: { checkOutAt: now, checkOutLat: input.latitude, checkOutLng: input.longitude } });
      }
      await tx.attendanceActionLog.create({ data: { userId, attendanceId: record.id, action: input.action, latitude: input.latitude, longitude: input.longitude, source: 'WEB' } });
      return record;
    }).then(async record => {
      await this.audit.log({ actorId: userId, action: input.action, entity: 'AttendanceRecord', entityId: record.id, metadata: { latitude: input.latitude, longitude: input.longitude } });
      return record;
    });
  }

  private startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
}
