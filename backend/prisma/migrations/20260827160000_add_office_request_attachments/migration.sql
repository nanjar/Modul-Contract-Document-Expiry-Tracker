CREATE TABLE "OfficeRequestAttachment" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeRequestAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficeRequestAttachment_requestId_createdAt_idx" ON "OfficeRequestAttachment"("requestId", "createdAt");
CREATE INDEX "OfficeRequestAttachment_uploadedById_createdAt_idx" ON "OfficeRequestAttachment"("uploadedById", "createdAt");

ALTER TABLE "OfficeRequestAttachment" ADD CONSTRAINT "OfficeRequestAttachment_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "OfficeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfficeRequestAttachment" ADD CONSTRAINT "OfficeRequestAttachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
