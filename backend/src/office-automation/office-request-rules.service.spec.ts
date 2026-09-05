import { BadRequestException } from '@nestjs/common';
import { OfficeRequestRulesService } from './office-request-rules.service';

describe('OfficeRequestRulesService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    officeRequest: { findMany: jest.fn() },
  } as any;
  const service = new OfficeRequestRulesService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('requires legacy leave fields and dates', async () => {
    await expect(service.validate('LEAVE' as any, {}, {}, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects leave that exceeds the employee quota', async () => {
    prisma.user.findUnique.mockResolvedValue({ leaveQuota: 12 });
    prisma.officeRequest.findMany.mockResolvedValue([{ startDate: new Date('2026-07-01'), endDate: new Date('2026-07-10') }]);
    await expect(service.validate('LEAVE' as any, { leaveType: 'Annual', reason: 'Holiday' }, { startDate: '2026-07-15', endDate: '2026-07-20' }, 'user-1')).rejects.toThrow('Leave quota exceeded');
  });

  it('accepts required fields for reimbursement', async () => {
    await expect(service.validate('REIMBURSEMENT' as any, { amount: 250000, description: 'Taxi' })).resolves.toBeUndefined();
  });

  it('requires overtime date, times, and reason', async () => {
    await expect(service.validate('OVERTIME' as any, { reason: 'Deadline' }, { startDate: '2026-09-05T18:00:00.000Z' })).rejects.toThrow('Overtime start time is required');
    await expect(service.validate('OVERTIME' as any, { startTime: '20:00', endTime: '18:00', reason: 'Deadline' }, { startDate: '2026-09-05T18:00:00.000Z' })).rejects.toThrow('Overtime end time must be after start time');
  });

  it('requires a date for WFH', async () => {
    await expect(service.validate('WFH' as any, { location: 'Home', reason: 'Internet repair' })).rejects.toThrow('WFH date is required');
  });

  it('requires a date range for business trip and meeting', async () => {
    await expect(service.validate('BUSINESS_TRIP' as any, { destination: 'Bandung', pic: 'HR' }, {})).rejects.toThrow('Business trip start date is required');
    await expect(service.validate('MEETING' as any, { roomId: 'Room A', participants: 'employee@example.com' }, { startDate: '2026-09-05T10:00:00.000Z' })).rejects.toThrow('Meeting end date is required');
  });
});
