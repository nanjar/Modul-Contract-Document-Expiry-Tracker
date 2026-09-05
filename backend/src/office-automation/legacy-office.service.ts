import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementRecipientType, AnnouncementStatus, OfficeRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LegacyOfficeService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnnouncements(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        OR: [
          { recipientType: AnnouncementRecipientType.ALL },
          { recipientType: AnnouncementRecipientType.ROLE, recipientRole: user.role },
          { recipientType: AnnouncementRecipientType.USER, metadata: { path: ['userId'], equals: userId } },
        ],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
      include: { reads: { where: { userId }, select: { readAt: true } } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async announcement(id: string, userId: string) {
    const item = await this.prisma.announcement.findUnique({ where: { id }, include: { reads: { where: { userId } } } });
    if (!item) throw new NotFoundException('Announcement not found');
    if (item.status !== AnnouncementStatus.PUBLISHED) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== 'SUPERUSER' && user?.role !== 'EDITOR') throw new NotFoundException('Announcement not found');
    }
    return item;
  }

  async createAnnouncement(input: {
    actorId: string;
    title: string;
    message: string;
    recipientType?: AnnouncementRecipientType;
    recipientRole?: string;
    expiresAt?: string;
    userId?: string;
  }) {
    const recipientType = input.recipientType ?? AnnouncementRecipientType.ALL;
    if (recipientType === AnnouncementRecipientType.ROLE && !input.recipientRole) throw new BadRequestException('recipientRole is required for role announcements');
    if (recipientType === AnnouncementRecipientType.USER && !input.userId) throw new BadRequestException('userId is required for user announcements');
    const created = await this.prisma.announcement.create({
      data: {
        title: input.title.trim(),
        message: input.message.trim(),
        recipientType,
        recipientRole: input.recipientRole as any,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        createdById: input.actorId,
        metadata: input.userId ? { userId: input.userId } : undefined,
      },
    });
    await this.prisma.auditLog.create({ data: { actorId: input.actorId, action: 'ANNOUNCEMENT_CREATED', entity: 'Announcement', entityId: created.id } });
    return created;
  }

  async publishAnnouncement(id: string, actorId: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    if (existing.status === AnnouncementStatus.PUBLISHED) return existing;
    const publishedAt = new Date();
    return this.prisma.$transaction(async tx => {
      const item = await tx.announcement.update({ where: { id }, data: { status: AnnouncementStatus.PUBLISHED, publishedAt } });
      await tx.integrationEvent.create({
        data: {
          event: 'ANNOUNCEMENT_PUBLISHED',
          entityId: id,
          idempotencyKey: `announcement-published:${id}:${publishedAt.getTime()}`,
          payload: { announcementId: id, title: item.title, message: item.message, recipientType: item.recipientType, recipientRole: item.recipientRole, metadata: item.metadata },
        },
      });
      await tx.auditLog.create({ data: { actorId, action: 'ANNOUNCEMENT_PUBLISHED', entity: 'Announcement', entityId: id } });
      return item;
    });
  }

  async markAnnouncementRead(id: string, userId: string) {
    await this.announcement(id, userId);
    return this.prisma.announcementReadReceipt.upsert({ where: { announcementId_userId: { announcementId: id, userId } }, create: { announcementId: id, userId }, update: { readAt: new Date() } });
  }

  async listRooms() {
    return this.prisma.meetingRoom.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async createRoom(input: { actorId: string; name: string; location?: string; capacity?: number }) {
    if (!input.name.trim()) throw new BadRequestException('Room name is required');
    if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity <= 0)) throw new BadRequestException('Capacity must be greater than zero');
    return this.prisma.meetingRoom.create({ data: { name: input.name.trim(), location: input.location?.trim(), capacity: input.capacity, metadata: { createdSource: 'web' } } });
  }

  async listBookings(userId: string, all = false) {
    return this.prisma.meetingBooking.findMany({
      where: all ? undefined : { createdById: userId },
      include: { room: true, createdBy: { select: { id: true, name: true, email: true } }, attendees: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createBooking(input: { actorId: string; roomId: string; title: string; description?: string; startsAt: string; endsAt: string; attendeeIds?: string[] }) {
    const startsAt = new Date(input.startsAt); const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new BadRequestException('Meeting end must be after meeting start');
    const room = await this.prisma.meetingRoom.findFirst({ where: { id: input.roomId, isActive: true } });
    if (!room) throw new NotFoundException('Meeting room not found');
    if (room.capacity && (input.attendeeIds?.length ?? 0) > room.capacity) throw new BadRequestException('Participant count exceeds room capacity');
    const attendeeIds = [...new Set(input.attendeeIds ?? [])];
    if (attendeeIds.length) {
      const count = await this.prisma.user.count({ where: { id: { in: attendeeIds }, isActive: true } });
      if (count !== attendeeIds.length) throw new BadRequestException('One or more participants are invalid or inactive');
    }
    return this.prisma.$transaction(async tx => {
      const conflict = await tx.meetingBooking.findFirst({ where: { roomId: input.roomId, status: { notIn: [OfficeRequestStatus.CANCELLED, OfficeRequestStatus.REJECTED] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (conflict) throw new BadRequestException('Meeting room is already booked for the selected time');
      const booking = await tx.meetingBooking.create({ data: { roomId: input.roomId, createdById: input.actorId, title: input.title.trim(), description: input.description?.trim(), startsAt, endsAt, status: OfficeRequestStatus.APPROVED, attendees: { create: attendeeIds.map(userId => ({ userId })) } }, include: { room: true, attendees: true } });
      await tx.integrationEvent.create({ data: { event: 'MEETING_BOOKING_CREATED', entityId: booking.id, idempotencyKey: `meeting-booking-created:${booking.id}`, payload: { bookingId: booking.id, roomId: booking.roomId, title: booking.title, startsAt, endsAt, attendeeIds } } });
      await tx.auditLog.create({ data: { actorId: input.actorId, action: 'MEETING_BOOKING_CREATED', entity: 'MeetingBooking', entityId: booking.id, metadata: { roomId: booking.roomId, startsAt, endsAt } } });
      return booking;
    });
  }

  async cancelBooking(id: string, actorId: string) {
    const existing = await this.prisma.meetingBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Meeting booking not found');
    if (existing.createdById !== actorId) {
      const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (actor?.role !== 'SUPERUSER' && actor?.role !== 'EDITOR') throw new BadRequestException('Only the creator or an authorized operator can cancel this booking');
    }
    const updated = await this.prisma.meetingBooking.update({ where: { id }, data: { status: OfficeRequestStatus.CANCELLED } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'MEETING_BOOKING_CANCELLED', entity: 'MeetingBooking', entityId: id } });
    return updated;
  }
}
