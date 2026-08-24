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

    // Send the secret in both the header and body. The repository's
    // authoritative n8n workflow validates the body field, while the header
    // keeps the transport compatible with integrations that validate headers.
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Contract-Tracker-Secret': webhookSecret,
      },
      body: JSON.stringify({
        ...event,
        secret: webhookSecret,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`n8n webhook failed: HTTP ${response.status} ${body}`);
    }

    this.logger.log(
      `n8n event dispatched: ${event.event} (${event.idempotencyKey})`,
    );

    return response;
  }
}
