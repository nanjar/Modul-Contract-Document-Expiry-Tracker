ALTER TABLE "Reminder" ADD COLUMN "processingAt" TIMESTAMP(3);
CREATE INDEX "Reminder_processingAt_idx" ON "Reminder"("processingAt");
