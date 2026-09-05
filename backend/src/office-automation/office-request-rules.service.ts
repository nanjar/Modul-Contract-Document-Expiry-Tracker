import { BadRequestException, Injectable } from '@nestjs/common';
import { OfficeRequestStatus, OfficeRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OfficeRequestRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(
    type: OfficeRequestType,
    metadata?: Record<string, unknown>,
    dates?: { startDate?: string; endDate?: string; requiredDate?: string },
    requesterId?: string,
  ) {
    const data = metadata ?? {};
    const required = (key: string, label: string) => {
      const value = data[key];
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new BadRequestException(`${label} is required for ${type}`);
      }
    };
    const positiveAmount = (key: string, label: string) => {
      required(key, label);
      const value = Number(data[key]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new BadRequestException(`${label} must be greater than zero`);
      }
    };
    const parseDate = (value: string | undefined, label: string) => {
      if (!value) throw new BadRequestException(`${label} is required for ${type}`);
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`${label} is invalid`);
      return parsed;
    };
    const validateRange = (startValue: string | undefined, endValue: string | undefined, label: string) => {
      const start = parseDate(startValue, `${label} start date`);
      const end = parseDate(endValue, `${label} end date`);
      if (end < start) throw new BadRequestException(`${label} end date cannot be before start date`);
      return { start, end };
    };

    switch (type) {
      case OfficeRequestType.LEAVE: {
        required('leaveType', 'Leave type');
        required('reason', 'Reason');
        if (!requesterId) break;
        const { start, end } = validateRange(dates?.startDate, dates?.endDate, 'Leave');
        const requestedDays = Math.floor((this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) / 86400000) + 1;
        const user = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { leaveQuota: true } });
        if (!user) throw new BadRequestException('Employee not found');
        const approved = await this.prisma.officeRequest.findMany({
          where: {
            requesterId,
            type: OfficeRequestType.LEAVE,
            status: OfficeRequestStatus.APPROVED,
            startDate: { not: null },
            endDate: { not: null },
          },
          select: { startDate: true, endDate: true },
        });
        const used = approved.reduce((sum, item) => {
          if (!item.startDate || !item.endDate) return sum;
          return sum + Math.max(0, Math.floor((this.startOfDay(item.endDate).getTime() - this.startOfDay(item.startDate).getTime()) / 86400000) + 1);
        }, 0);
        if (used + requestedDays > user.leaveQuota) {
          throw new BadRequestException(`Leave quota exceeded. Remaining balance: ${Math.max(0, user.leaveQuota - used)} day(s)`);
        }
        break;
      }
      case OfficeRequestType.ATTENDANCE:
        required('action', 'Attendance action');
        if (!['CHECK_IN', 'CHECK_OUT', 'checkin', 'checkout'].includes(String(data.action))) {
          throw new BadRequestException('Attendance action must be CHECK_IN or CHECK_OUT');
        }
        break;
      case OfficeRequestType.LATE:
        required('estimatedArrival', 'Estimated arrival');
        required('reason', 'Reason');
        break;
      case OfficeRequestType.WFH:
        required('location', 'WFH location');
        required('reason', 'Reason');
        parseDate(dates?.startDate ?? dates?.requiredDate, 'WFH date');
        break;
      case OfficeRequestType.OVERTIME:
        required('reason', 'Reason');
        required('startTime', 'Overtime start time');
        required('endTime', 'Overtime end time');
        parseDate(dates?.startDate ?? dates?.requiredDate, 'Overtime date');
        if (String(data.endTime) <= String(data.startTime)) {
          throw new BadRequestException('Overtime end time must be after start time');
        }
        break;
      case OfficeRequestType.REIMBURSEMENT:
        positiveAmount('amount', 'Reimbursement amount');
        required('description', 'Expense description');
        break;
      case OfficeRequestType.BUSINESS_TRIP:
        required('destination', 'Destination');
        required('pic', 'PIC');
        validateRange(dates?.startDate, dates?.endDate, 'Business trip');
        break;
      case OfficeRequestType.MEETING:
        required('roomId', 'Meeting room');
        required('participants', 'Participants');
        validateRange(dates?.startDate, dates?.endDate, 'Meeting');
        break;
      case OfficeRequestType.ASSET:
        required('assetName', 'Asset name');
        required('reason', 'Reason');
        break;
      case OfficeRequestType.ANNOUNCEMENT:
        required('message', 'Announcement message');
        break;
      case OfficeRequestType.GENERAL:
        break;
    }
  }

  private startOfDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
}
