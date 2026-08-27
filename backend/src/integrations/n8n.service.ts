import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(private readonly config: ConfigService) {}

  async dispatch(event: {
    event: string;
    entityId?: string | null;
    payload?: unknown;
    idempotencyKey: string;
  }) {
    const webhookUrl = this.config.get<string>('n8n.webhookUrl');
    const webhookSecret = this.config.get<string>('n8n.webhookSecret');

    if (!webhookUrl || !webhookSecret) {
      throw new Error('n8n webhook configuration is incomplete');
    }

    const timeoutMs = Number(this.config.get<string>('n8n.webhookTimeoutMs') ?? 15000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Contract-Tracker-Secret': webhookSecret,
          'X-Idempotency-Key': event.idempotencyKey,
          'X-Integration-Event': event.event,
        },
        body: JSON.stringify({
          ...event,
          secret: webhookSecret,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`n8n webhook failed: HTTP ${response.status} ${body}`);
      }

      this.logger.log(
        `n8n event dispatched: ${event.event} (${event.idempotencyKey})`,
      );

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`n8n webhook timeout after ${Math.max(1000, timeoutMs)}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
