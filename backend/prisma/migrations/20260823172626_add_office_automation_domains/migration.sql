-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('CONTRACT_DOCUMENT', 'OFFICE_AUTOMATION');

-- CreateEnum
CREATE TYPE "OfficeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OfficeRequestType" AS ENUM ('LEAVE', 'ATTENDANCE', 'GENERAL', 'LATE', 'WFH', 'OVERTIME', 'REIMBURSEMENT', 'BUSINESS_TRIP', 'MEETING');

-- CreateEnum
CREATE TYPE "IntegrationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'WFH', 'OFF');

-- CreateEnum
CREATE TYPE "AttendanceAction" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnnouncementRecipientType" AS ENUM ('ALL', 'ROLE', 'USER');

-- CreateTable
CREATE TABLE "UserModuleAccess" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "module" "ModuleKey" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserModuleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTelegramIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "chatId" TEXT NOT NULL,
    "username" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserTelegramIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeRequest" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "type" "OfficeRequestType" NOT NULL,
    "requesterId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "requiredDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" "OfficeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "OfficeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeTask" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" UUID,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OfficeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeApproval" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "approverId" UUID NOT NULL,
    "status" "OfficeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OfficeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeActivityLog" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "IntegrationEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "checkInLat" DECIMAL(10,7),
    "checkInLng" DECIMAL(10,7),
    "checkOutLat" DECIMAL(10,7),
    "checkOutLng" DECIMAL(10,7),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceActionLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "attendanceId" UUID,
    "action" "AttendanceAction" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientType" "AnnouncementRecipientType" NOT NULL DEFAULT 'ALL',
    "recipientRole" "Role",
    "createdById" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementReadReceipt" (
    "id" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRoom" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingBooking" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "OfficeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserModuleAccess_module_idx" ON "UserModuleAccess"("module");
CREATE UNIQUE INDEX "UserModuleAccess_userId_module_key" ON "UserModuleAccess"("userId", "module");
CREATE UNIQUE INDEX "UserTelegramIdentity_chatId_key" ON "UserTelegramIdentity"("chatId");
CREATE INDEX "UserTelegramIdentity_userId_idx" ON "UserTelegramIdentity"("userId");
CREATE UNIQUE INDEX "OfficeRequest_requestNumber_key" ON "OfficeRequest"("requestNumber");
CREATE INDEX "OfficeRequest_requesterId_status_idx" ON "OfficeRequest"("requesterId", "status");
CREATE INDEX "OfficeRequest_type_status_idx" ON "OfficeRequest"("type", "status");
CREATE INDEX "OfficeRequest_requiredDate_idx" ON "OfficeRequest"("requiredDate");
CREATE INDEX "OfficeRequest_requestedAt_idx" ON "OfficeRequest"("requestedAt");
CREATE INDEX "OfficeTask_assigneeId_status_idx" ON "OfficeTask"("assigneeId", "status");
CREATE INDEX "OfficeTask_dueDate_status_idx" ON "OfficeTask"("dueDate", "status");
CREATE INDEX "OfficeApproval_approverId_status_idx" ON "OfficeApproval"("approverId", "status");
CREATE INDEX "OfficeApproval_requestId_status_idx" ON "OfficeApproval"("requestId", "status");
CREATE INDEX "OfficeActivityLog_requestId_createdAt_idx" ON "OfficeActivityLog"("requestId", "createdAt");
CREATE INDEX "OfficeActivityLog_actorId_createdAt_idx" ON "OfficeActivityLog"("actorId", "createdAt");
CREATE UNIQUE INDEX "IntegrationEvent_idempotencyKey_key" ON "IntegrationEvent"("idempotencyKey");
CREATE INDEX "IntegrationEvent_status_availableAt_idx" ON "IntegrationEvent"("status", "availableAt");
CREATE INDEX "IntegrationEvent_event_entityId_idx" ON "IntegrationEvent"("event", "entityId");
CREATE INDEX "AttendanceRecord_attendanceDate_status_idx" ON "AttendanceRecord"("attendanceDate", "status");
CREATE INDEX "AttendanceRecord_userId_attendanceDate_idx" ON "AttendanceRecord"("userId", "attendanceDate");
CREATE UNIQUE INDEX "AttendanceRecord_userId_attendanceDate_key" ON "AttendanceRecord"("userId", "attendanceDate");
CREATE INDEX "AttendanceActionLog_userId_createdAt_idx" ON "AttendanceActionLog"("userId", "createdAt");
CREATE INDEX "AttendanceActionLog_attendanceId_createdAt_idx" ON "AttendanceActionLog"("attendanceId", "createdAt");
CREATE INDEX "Announcement_status_publishedAt_idx" ON "Announcement"("status", "publishedAt");
CREATE INDEX "Announcement_recipientType_recipientRole_idx" ON "Announcement"("recipientType", "recipientRole");
CREATE INDEX "AnnouncementReadReceipt_userId_readAt_idx" ON "AnnouncementReadReceipt"("userId", "readAt");
CREATE UNIQUE INDEX "AnnouncementReadReceipt_announcementId_userId_key" ON "AnnouncementReadReceipt"("announcementId", "userId");
CREATE UNIQUE INDEX "MeetingRoom_name_key" ON "MeetingRoom"("name");
CREATE INDEX "MeetingBooking_roomId_startsAt_endsAt_idx" ON "MeetingBooking"("roomId", "startsAt", "endsAt");
CREATE INDEX "MeetingBooking_createdById_startsAt_idx" ON "MeetingBooking"("createdById", "startsAt");
CREATE INDEX "MeetingAttendee_userId_status_idx" ON "MeetingAttendee"("userId", "status");
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");

-- AddForeignKey
ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTelegramIdentity" ADD CONSTRAINT "UserTelegramIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeRequest" ADD CONSTRAINT "OfficeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficeTask" ADD CONSTRAINT "OfficeTask_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OfficeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeTask" ADD CONSTRAINT "OfficeTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfficeApproval" ADD CONSTRAINT "OfficeApproval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OfficeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeApproval" ADD CONSTRAINT "OfficeApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficeActivityLog" ADD CONSTRAINT "OfficeActivityLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceActionLog" ADD CONSTRAINT "AttendanceActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceActionLog" ADD CONSTRAINT "AttendanceActionLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnnouncementReadReceipt" ADD CONSTRAINT "AnnouncementReadReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementReadReceipt" ADD CONSTRAINT "AnnouncementReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingBooking" ADD CONSTRAINT "MeetingBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MeetingRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingBooking" ADD CONSTRAINT "MeetingBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "MeetingBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
