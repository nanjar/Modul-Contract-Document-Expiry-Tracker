import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TelegramIdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async set(userId: string, chatId: string, username: string | undefined, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const normalizedChatId = chatId.trim();
    if (!normalizedChatId) throw new ConflictException('Telegram Chat ID is required');

    const owner = await this.prisma.userTelegramIdentity.findUnique({
      where: { chatId: normalizedChatId },
      select: { id: true, userId: true },
    });
    if (owner && owner.userId !== userId) {
      throw new ConflictException('Telegram Chat ID is already assigned to another user');
    }

    const existing = await this.prisma.userTelegramIdentity.findFirst({
      where: { userId },
    });

    const identity = existing
      ? await this.prisma.userTelegramIdentity.update({
          where: { id: existing.id },
          data: {
            chatId: normalizedChatId,
            username: username?.trim() || null,
            isVerified: true,
          },
        })
      : await this.prisma.userTelegramIdentity.create({
          data: {
            userId,
            chatId: normalizedChatId,
            username: username?.trim() || null,
            isVerified: true,
          },
        });

    await this.audit.log({
      actorId,
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'UserTelegramIdentity',
      entityId: identity.id,
      metadata: {
        userId,
        chatId: normalizedChatId,
        username: identity.username,
        isVerified: identity.isVerified,
      },
    });

    return identity;
  }

  async remove(userId: string, actorId: string) {
    const identity = await this.prisma.userTelegramIdentity.findFirst({ where: { userId } });
    if (!identity) return { removed: false };

    await this.prisma.userTelegramIdentity.delete({ where: { id: identity.id } });

    await this.audit.log({
      actorId,
      action: 'DELETE',
      entity: 'UserTelegramIdentity',
      entityId: identity.id,
      metadata: { userId, chatId: identity.chatId },
    });

    return { removed: true };
  }
}
