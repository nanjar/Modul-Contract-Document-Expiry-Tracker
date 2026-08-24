import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { N8nService } from './n8n.service';

type EventPayload = Record<string, unknown>;

type TelegramRecipient = {
  userId: string;
  chatId: string;
  username: string | null;
  isVerified: boolean;
  name: string | null;
};

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
          const payload = await this.enrichPayload(event.payload);

          await this.n8n.dispatch({
            event: event.event,
            entityId: event.entityId,
            payload,
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

  private async enrichPayload(raw: unknown): Promise<unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;

    const payload = raw as EventPayload;
    const candidateIds = [
      payload.userId,
      payload.requesterId,
      payload.assigneeId,
      payload.approverId,
      payload.actorId,
    ].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    const userIds = [...new Set(candidateIds)];
    if (userIds.length === 0) return payload;

    const [identities, users] = await Promise.all([
      this.prisma.userTelegramIdentity.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          chatId: true,
          username: true,
          isVerified: true,
        },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
    ]);

    const names = new Map(users.map((user) => [user.id, user.name]));
    const telegramRecipients: TelegramRecipient[] = identities.map((identity) => ({
      userId: identity.userId,
      chatId: identity.chatId,
      username: identity.username,
      isVerified: identity.isVerified,
      name: names.get(identity.userId) ?? null,
    }));

    const recipientsByUserId = new Map(
      telegramRecipients
        .filter((recipient) => recipient.isVerified && recipient.chatId)
        .map((recipient) => [recipient.userId, recipient]),
    );

    const recipient = (id: unknown) =>
      typeof id === 'string' ? recipientsByUserId.get(id) : undefined;

    const requester = recipient(payload.requesterId);
    const approver = recipient(payload.approverId);
    const actor = recipient(payload.actorId);
    const assignee = recipient(payload.assigneeId);

    // Keep the canonical camelCase payload while also providing the exact
    // aliases consumed by the authoritative Office Automation n8n workflow.
    return {
      ...payload,
      request_number: payload.requestNumber ?? null,
      request_type: payload.requestType ?? payload.type ?? null,
      requester_name: requester?.name ?? null,
      requester_chat_id: requester?.chatId ?? null,
      chat_id: requester?.chatId ?? actor?.chatId ?? assignee?.chatId ?? null,
      approver_name: approver?.name ?? actor?.name ?? null,
      approver_chat_id: approver?.chatId ?? null,
      task_title: payload.taskTitle ?? payload.title ?? null,
      due_date: payload.dueDate ?? payload.requiredDate ?? null,
      telegramRecipients,
    };
  }
}
