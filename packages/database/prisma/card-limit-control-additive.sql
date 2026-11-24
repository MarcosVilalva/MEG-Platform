-- Etapa 10. Revisar e aprovar migration antes de qualquer deploy.
-- APENAS aditiva, nenhuma execucao em banco protegido autorizada.
CREATE TABLE IF NOT EXISTS "CardLimitControl" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "scopeKey" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'BLOCK',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardLimitControl_mode_check" CHECK ("mode" IN ('BLOCK','CONFIRM')),
  CONSTRAINT "CardLimitControl_scope_check" CHECK ("scopeKey" = 'GLOBAL' OR "scopeKey" LIKE 'CARD:%')
);
CREATE UNIQUE INDEX IF NOT EXISTS "CardLimitControl_workspaceId_scopeKey_key"
  ON "CardLimitControl"("workspaceId","scopeKey");
CREATE INDEX IF NOT EXISTS "CardLimitControl_workspaceId_idx"
  ON "CardLimitControl"("workspaceId");

-- Mesma politica DENY BY DEFAULT da fundacao financeira Supabase.
-- O backend opera pela role proprietaria, sem FORCE RLS e sem policies auth.uid().
ALTER TABLE public."CardLimitControl" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."CardLimitControl" FROM PUBLIC;
DO $pt104$
DECLARE target_role TEXT;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."CardLimitControl" FROM %I', target_role);
    END IF;
  END LOOP;
END
$pt104$;
