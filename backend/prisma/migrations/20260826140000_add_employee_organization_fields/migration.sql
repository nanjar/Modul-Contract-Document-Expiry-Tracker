-- Employee organization fields are added to the existing User identity.
ALTER TABLE "User"
  ADD COLUMN "employeeNumber" TEXT,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "position" TEXT,
  ADD COLUMN "managerId" UUID;

CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");

CREATE INDEX "User_managerId_idx" ON "User"("managerId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
