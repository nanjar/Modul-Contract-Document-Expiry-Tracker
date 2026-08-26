-- Repair migration for environments where the employee organization migration
-- was previously marked as applied without actually changing the database.
-- Keep this migration idempotent so it is safe against partially repaired databases.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "employeeNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "department" TEXT,
  ADD COLUMN IF NOT EXISTS "position" TEXT,
  ADD COLUMN IF NOT EXISTS "managerId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "User_employeeNumber_key"
  ON "User"("employeeNumber");

CREATE INDEX IF NOT EXISTS "User_managerId_idx"
  ON "User"("managerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_managerId_fkey'
      AND conrelid = '"User"'::regclass
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_managerId_fkey"
      FOREIGN KEY ("managerId") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
