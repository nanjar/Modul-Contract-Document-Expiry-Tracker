import { BadRequestException, Injectable } from '@nestjs/common';
import { OfficeRequestStatus, OfficeRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OfficeRequestRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(type: OfficeRequestType, metadata?: Record<string, unknown>, dates?: { startDate?: string; endDate?: string }, requesterId?: string) {
    const data = metadata ?? {};
    const required = (key: string, label: string) => {
      const value = data[key];
      if (value === undefined || value === null || String(value).trim() === '') throw new BadRequestException(`${label} is required for ${type}`);
    };
    const positiveAmount = (key: string, label: string) => {
      required(key, label);
      const value = Number(data[key]);
      if (!Number.isFinite(value) || value <= 0) throw new BadRequestException(`${label} must be greater than zero`);
    };
    switch (type) {
      case OfficeRequestType.LEAVE: {
        required('leaveType', 'Leave type'); required('reason', 'Reason');
        if (!requesterId) break;
        if (!dates?.startDate || !dates?.endDate) throw new BadRequestException('Start date and end date are required for leave');
        const start = new Date(dates.startDate); const end = new Date(dates.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new BadRequestException('Invalid leave date range');
        const requestedDays = Math.floor((this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) / 86400000) + 1;
        const user = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { leaveQuota: true } });
        if (!user) throw new BadRequestException('Employee not found');
        const approved = await this.prisma.officeRequest.findMany({ where: { requesterId, type: OfficeRequestType.LEAVE, status: OfficeRequestStatus.APPROVED, startDate: { not: null }, endDate: { not: null } }, select: { startDate: true, endDate: true } });
        const used = approved.reduce((sum, item) => {
          if (!item.startDate || !item.endDate) return sum;
          return sum + Math.max(0, Math.floor((this.startOfDay(item.endDate).getTime() - this.startOfDay(item.startDate).getTime()) / 86400000) + 1);
        }, 0);
        if (used + requestedDays > user.leaveQuota) throw new BadRequestException(`Leave quota exceeded. Remaining balance: ${Math.max(0, user.leaveQuota - used)} day(s)`);
        break;
      }
      case OfficeRequestType.ATTENDANCE: required('action', 'Attendance action'); if (!['CHECK_IN','CHECK_OUT','checkin','checkout'].includes(String(data.action))) throw new BadRequestException('Attendance action must be CHECK_IN or CHECK_OUT'); break;
      case OfficeRequestType.LATE: required('estimatedArrival', 'Estimated arrival'); required('reason', 'Reason'); break;
      case OfficeRequestType.WFH: required('location', 'WFH location'); required('reason', 'Reason'); break;
      case OfficeRequestType.OVERTIME: required('reason', 'Reason'); break;
      case OfficeRequestType.REIMBURSEMENT: positiveAmount('amount', 'Reimbursement amount'); required('description', 'Expense description'); break;
      case OfficeRequestType.BUSINESS_TRIP: required('destination', 'Destination'); required('pic', 'PIC'); break;
      case OfficeRequestType.MEETING: required('roomId', 'Meeting room'); required('participants', 'Participants'); break;
      case OfficeRequestType.ASSET: required('assetName', 'Asset name'); required('reason', 'Reason'); break;
      case OfficeRequestType.ANNOUNCEMENT: required('message', 'Announcement message'); break;
      case OfficeRequestType.GENERAL: break;
    }
  }

  private startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
}
