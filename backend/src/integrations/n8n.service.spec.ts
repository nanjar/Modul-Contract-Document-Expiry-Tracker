import { N8nService } from './n8n.service';

describe('N8nService security contract', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends the shared secret only as an authentication header', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = fetchMock as any;

    const config = {
      get: jest.fn((key: string) => ({
        'n8n.webhookUrl': 'https://example.test/webhook',
        'n8n.webhookSecret': 'super-secret',
        'n8n.webhookTimeoutMs': '1000',
      } as Record<string, string>)[key]),
    } as any;

    await new N8nService(config).dispatch({
      event: 'OFFICE_REQUEST_CREATED',
      entityId: 'request-1',
      payload: { requesterId: 'user-1' },
      idempotencyKey: 'office-request-created:request-1',
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(options.headers['X-Contract-Tracker-Secret']).toBe('super-secret');
    expect(body).not.toHaveProperty('secret');
    expect(body.payload).toEqual({ requesterId: 'user-1' });
  });

  it('rejects when n8n configuration is incomplete', async () => {
    const config = { get: jest.fn(() => undefined) } as any;

    await expect(
      new N8nService(config).dispatch({ event: 'TEST', idempotencyKey: 'test:1' }),
    ).rejects.toThrow('n8n webhook configuration is incomplete');
  });
});
