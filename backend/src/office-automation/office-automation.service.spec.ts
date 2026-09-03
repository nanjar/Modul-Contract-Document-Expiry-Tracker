import { ForbiddenException } from '@nestjs/common';
import { OfficeAutomationService } from './office-automation.service';

describe('OfficeAutomationService access boundaries', () => {
  const users = {
    assertModuleAccess: jest.fn(),
  } as any;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    userModuleAccess: {
      findUnique: jest.fn(),
    },
    officeRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    officeTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  } as any;

  let service: OfficeAutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OfficeAutomationService(prisma, users);
    users.assertModuleAccess.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({ role: 'VIEWER' });
    prisma.userModuleAccess.findUnique.mockResolvedValue({ permissions: ['OFFICE_REQUEST_VIEW'] });
    prisma.officeRequest.findMany.mockResolvedValue([]);
    prisma.officeTask.findMany.mockResolvedValue([]);
  });

  it('uses canonical request-view permission for request lists', async () => {
    await service.list(undefined, 'employee-1');
    expect(users.assertModuleAccess).toHaveBeenCalledWith(
      'employee-1',
      'OFFICE_AUTOMATION',
      'OFFICE_REQUEST_VIEW',
    );
  });

  it('scopes employee request lists to the authenticated employee', async () => {
    await service.list(undefined, 'employee-1');

    expect(prisma.officeRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requesterId: 'employee-1' } }),
    );
  });

  it('does not allow an employee to select another requester in the list filter', async () => {
    await service.list('employee-2', 'employee-1');

    expect(prisma.officeRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requesterId: 'employee-1' } }),
    );
  });

  it('allows managers to list another requester with request-edit permission', async () => {
    prisma.userModuleAccess.findUnique.mockResolvedValue({ permissions: ['OFFICE_REQUEST_VIEW', 'OFFICE_REQUEST_EDIT'] });

    await service.list('employee-2', 'manager-1');

    expect(prisma.officeRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requesterId: 'employee-2' } }),
    );
  });

  it('rejects an employee reading another employee request', async () => {
    prisma.officeRequest.findUnique.mockResolvedValue({ requesterId: 'employee-2' });

    await expect(service.findOne('request-1', 'employee-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes employee task lists to assigned tasks', async () => {
    await service.listTasks('employee-1', 'employee-2');

    expect(users.assertModuleAccess).toHaveBeenCalledWith(
      'employee-1',
      'OFFICE_AUTOMATION',
      'OFFICE_TASK_VIEW',
    );
    expect(prisma.officeTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assigneeId: 'employee-1' } }),
    );
  });

  it('allows a manager to filter tasks by assignee', async () => {
    prisma.userModuleAccess.findUnique.mockResolvedValue({ permissions: ['OFFICE_REQUEST_VIEW', 'OFFICE_REQUEST_EDIT'] });

    await service.listTasks('manager-1', 'employee-2');

    expect(prisma.officeTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assigneeId: 'employee-2' } }),
    );
  });

  it('rejects an employee updating another employee task', async () => {
    prisma.officeTask.findUnique.mockResolvedValue({ id: 'task-1', requestId: 'request-1', assigneeId: 'employee-2' });

    await expect(
      service.updateTask('task-1', { status: 'COMPLETED' } as any, 'employee-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
