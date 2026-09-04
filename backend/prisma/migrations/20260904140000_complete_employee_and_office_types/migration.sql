-- Add legacy HR employee fields used by Office Automation.
ALTER TABLE "User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "leaveQuota" INTEGER NOT NULL DEFAULT 12;

-- Preserve existing production data while extending the request taxonomy
-- to cover the legacy HR menu: Asset Request and Announcement.
ALTER TYPE "OfficeRequestType" ADD VALUE IF NOT EXISTS 'ASSET';
ALTER TYPE "OfficeRequestType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';

-- Defensive constraint: leave quota cannot be negative.
ALTER TABLE "User"
  ADD CONSTRAINT "User_leaveQuota_nonnegative" CHECK ("leaveQuota" >= 0);
