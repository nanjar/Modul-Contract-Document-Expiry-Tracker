CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('SUPERUSER', 'EDITOR', 'VIEWER');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'VIEWER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Document" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "documentNumber" TEXT,
  "title" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "description" TEXT,
  "counterparty" TEXT,
  "ownerId" UUID,
  "issueDate" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "storageKey" TEXT,
  "originalFilename" TEXT,
  "mimeType" TEXT,
  "fileSize" BIGINT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "archivedById" UUID,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");
CREATE INDEX "Document_archivedAt_idx" ON "Document"("archivedAt");
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Reminder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL,
  "daysBefore" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reminder_documentId_daysBefore_key" ON "Reminder"("documentId", "daysBefore");
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorId" UUID,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
