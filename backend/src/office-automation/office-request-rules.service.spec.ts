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
});
