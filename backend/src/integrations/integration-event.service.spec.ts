import { IntegrationEventService } from './integration-event.service';

describe('IntegrationEventService delivery contract', () => {
  const prisma = {
    integrationEvent: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    officeRequest: { findUnique: jest.fn() },
    officeTask: { findUnique: jest.fn() },
    userTelegramIdentity: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  } as any;

  const n8n = { dispatch: jest.fn() } as any;
  let service: IntegrationEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntegrationEventService(prisma, n8n);
    prisma.integrationEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.officeRequest.findUnique.mockResolvedValue(null);
    prisma.officeTask.findUnique.mockResolvedValue(null);
    prisma.userTelegramIdentity.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
  });

  it('marks a successfully delivered event as DELIVERED', async () => {
    prisma.integrationEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        event: 'OFFICE_REQUEST_CREATED',
        entityId: 'request-1',
        payload: { message: 'created' },
        idempotencyKey: 'office-request-created:request-1',
        attempts: 0,
      },
    ]);
    n8n.dispatch.mockResolvedValue(new Response('{}', { status: 200 }));
    prisma.integrationEvent.update.mockResolvedValue({});

    const result = await service.processPendingEvents();

    expect(result).toEqual({ processed: 1, skipped: false });
    expect(n8n.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      event: 'OFFICE_REQUEST_CREATED',
      idempotencyKey: 'office-request-created:request-1',
    }));
    expect(prisma.integrationEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'event-1' },
      data: expect.objectContaining({ status: 'DELIVERED' }),
    }));
  });

  it('returns a failed delivery to PENDING with exponential backoff', async () => {
    prisma.integrationEvent.findMany.mockResolvedValue([
      {
        id: 'event-2',
        event: 'OFFICE_REQUEST_CREATED',
        entityId: 'request-2',
        payload: { message: 'created' },
        idempotencyKey: 'office-request-created:request-2',
        attempts: 1,
      },
    ]);
    n8n.dispatch.mockRejectedValue(new Error('n8n unavailable'));
    prisma.integrationEvent.update.mockResolvedValue({});

    await service.processPendingEvents();

    expect(prisma.integrationEvent.update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'event-2' },
      data: expect.objectContaining({
        status: 'PENDING',
        lastError: 'n8n unavailable',
      }),
    }));
    const update = prisma.integrationEvent.update.mock.calls.at(-1)[0];
    expect(update.data.availableAt).toBeInstanceOf(Date);
  });

  it('marks an event FAILED after the fifth delivery attempt', async () => {
    prisma.integrationEvent.findMany.mockResolvedValue([
      {
        id: 'event-3',
        event: 'OFFICE_REQUEST_CREATED',
        entityId: 'request-3',
        payload: { message: 'created' },
        idempotencyKey: 'office-request-created:request-3',
        attempts: 4,
      },
    ]);
    n8n.dispatch.mockRejectedValue(new Error('telegram failure'));
    prisma.integrationEvent.update.mockResolvedValue({});

    await service.processPendingEvents();

    expect(prisma.integrationEvent.update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'event-3' },
      data: expect.objectContaining({
        status: 'FAILED',
        lastError: 'telegram failure',
      }),
    }));
  });

  it('does not process an event that another worker already claimed', async () => {
    prisma.integrationEvent.findMany.mockResolvedValue([
      {
        id: 'event-4',
        event: 'OFFICE_REQUEST_CREATED',
        entityId: 'request-4',
        payload: {},
        idempotencyKey: 'office-request-created:request-4',
        attempts: 0,
      },
    ]);
    prisma.integrationEvent.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.processPendingEvents();

    expect(result).toEqual({ processed: 0, skipped: false });
    expect(n8n.dispatch).not.toHaveBeenCalled();
  });
});
