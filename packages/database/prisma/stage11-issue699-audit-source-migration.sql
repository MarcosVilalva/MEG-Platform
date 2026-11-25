-- Stage11 Issue #699: controlled one-time AuditLog provenance migration.
-- DO NOT use Prisma db push on an old database before this SQL.
-- Not authorized for production or any protected database in this phase.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE "AuditLog" IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'AuditLog' AND column_name = 'sourceChannel'
  ) THEN
    RAISE EXCEPTION 'AUDIT_SOURCE_ALREADY_MIGRATED';
  END IF;
END
$guard$;
ALTER TABLE "AuditLog" ADD COLUMN "sourceChannel" TEXT;
-- Every row in the table at this instant is pre-migration history.
UPDATE "AuditLog" SET "sourceChannel" = 'historico-desconhecido'
  WHERE "sourceChannel" IS NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "sourceChannel" SET DEFAULT 'canal-nao-atestado';
ALTER TABLE "AuditLog" ALTER COLUMN "sourceChannel" SET NOT NULL;
-- The reserved value web CANNOT be persisted until a verified ingress is implemented.
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sourceChannel_verified_guard"
  CHECK ("sourceChannel" IN ('canal-nao-atestado', 'historico-desconhecido'));
COMMIT;
