import { BadRequestException, Injectable } from '@nestjs/common';
import { OfficeRequestType } from '@prisma/client';

/**
 * Business fields derived from the legacy HRD Entry Level workflow.
 * Flexible metadata remains the transport envelope, while this service
 * guarantees the required fields for each legacy request type.
 */
@Injectable()
export class OfficeRequestRulesService {
  validate(type: OfficeRequestType, metadata?: Record<string, unknown>) {
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
      if (!Number.isFinite(value) || value <= 0) throw new BadRequestException(`${label} must be greater than zero`);
    };

    switch (type) {
      case OfficeRequestType.LEAVE:
        required('leaveType', 'Leave type');
        required('reason', 'Reason');
        break;
      case OfficeRequestType.ATTENDANCE:
        required('action', 'Attendance action');
        if (!['CHECK_IN', 'CHECK_OUT', 'checkin', 'checkout'].includes(String(data.action))) throw new BadRequestException('Attendance action must be CHECK_IN or CHECK_OUT');
        break;
      case OfficeRequestType.LATE:
        required('estimatedArrival', 'Estimated arrival');
        required('reason', 'Reason');
        break;
      case OfficeRequestType.WFH:
        required('location', 'WFH location');
        required('reason', 'Reason');
        break;
      case OfficeRequestType.OVERTIME:
        required('reason', 'Reason');
        break;
      case OfficeRequestType.REIMBURSEMENT:
        positiveAmount('amount', 'Reimbursement amount');
        required('description', 'Expense description');
        break;
      case OfficeRequestType.BUSINESS_TRIP:
        required('destination', 'Destination');
        required('pic', 'PIC');
        break;
      case OfficeRequestType.MEETING:
        required('roomId', 'Meeting room');
        required('participants', 'Participants');
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
}
