import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { N8nService } from './n8n.service';

@Injectable()
export class IntegrationEventService {
  private readonly logger = new Logger(IntegrationEventService.name);
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8n: N8nService,
  ) {}

  async processPendingEvents(limit = 10) {
    if (this.processing) {
      return { processed: 0, skipped: true };
    }

    this.processing = true;
    let processed = 0;
    const MAX_ATTEMPTS = 5;

    try {
      const events = await this.prisma.integrationEvent.findMany({
        where: {
          status: 'PENDING',
          availableAt: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      for (const event of events) {
        const claimed = await this.prisma.integrationEvent.updateMany({
          where: { id: event.id, status: 'PENDING' },
          data: {
            status: 'PROCESSING',
            attempts: { increment: 1 },
          },
        });

        if (claimed.count !== 1) continue;

        try {
          await this.n8n.dispatch({
            event: event.event,
            entityId: event.entityId,
            payload: event.payload,
            idempotencyKey: event.idempotencyKey,
          });

          await this.prisma.integrationEvent.update({
            where: { id: event.id },
            data: {
              status: 'DELIVERED',
              processedAt: new Date(),
              lastError: null,
            },
          });

          processed++;
          this.logger.log(
            `Integration event delivered: ${event.event} ${event.id}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const nextAttempt = event.attempts + 1;

          if (nextAttempt >= MAX_ATTEMPTS) {
            await this.prisma.integrationEvent.update({
              where: { id: event.id },
              data: {
                status: 'FAILED',
                processedAt: new Date(),
                lastError: message,
              },
            });

            this.logger.error(
              `Integration event permanently failed: ${event.event} ${event.id}; attempts=${nextAttempt}: ${message}`,
            );
            continue;
          }

          const delaySeconds = 30 * Math.pow(2, Math.max(0, nextAttempt - 1));
          const availableAt = new Date(Date.now() + delaySeconds * 1000);

          await this.prisma.integrationEvent.update({
            where: { id: event.id },
            data: {
              status: 'PENDING',
              availableAt,
              lastError: message,
            },
          });

          this.logger.error(
            `Integration event failed: ${event.event} ${event.id}; attempt ${nextAttempt}/${MAX_ATTEMPTS}; retry in ${delaySeconds}s: ${message}`,
          );
        }
      }

      return { processed, skipped: false };
    } finally {
      this.processing = false;
    }
  }
}
