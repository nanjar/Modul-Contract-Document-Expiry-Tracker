CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "SystemSetting" ("key", "value", "updatedAt")
VALUES ('warning_threshold_days', '30', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
