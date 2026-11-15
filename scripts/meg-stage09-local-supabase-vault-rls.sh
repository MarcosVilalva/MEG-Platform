#!/usr/bin/env bash
# Somente banco PostgreSQL criado no runner descartavel GitHub Actions.
set -Eeuo pipefail
test "$CI" = 'true'
test "$GITHUB_ACTIONS" = 'true'
test -z "$SUPABASE_ACCESS_TOKEN"
test -z "$DATABASE_URL"
db="$(docker ps --filter name=supabase_db_ --format '{{.Names}}' | head -n1)"
test -n "$db"
case "$db" in supabase_db_*) ;; *) echo 'LOCAL_SUPABASE_DB_GUARD_FAILED' >&2; exit 3;; esac

docker exec -i "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.meg_stage09_rls_fixture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  label text NOT NULL
);
ALTER TABLE public.meg_stage09_rls_fixture ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.meg_stage09_rls_fixture TO anon, authenticated;
CREATE POLICY meg_stage09_rls_owner_only
  ON public.meg_stage09_rls_fixture
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE EXTENSION IF NOT EXISTS supabase_vault;
DO $stage09$
DECLARE
  fake_id uuid;
BEGIN
  fake_id := vault.create_secret(
    'MEG_STAGE09_LOCAL_NOT_REAL_ROOTKEY',
    'meg_stage09_local_fake_secret',
    'Only for disposable GitHub Actions fixture'
  );
  IF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = fake_id)
     IS DISTINCT FROM 'MEG_STAGE09_LOCAL_NOT_REAL_ROOTKEY' THEN
    RAISE EXCEPTION 'Synthetic local Vault decrypt mismatch';
  END IF;
  IF (SELECT secret = decrypted_secret FROM vault.decrypted_secrets WHERE id = fake_id) THEN
    RAISE EXCEPTION 'Local Vault ciphertext equals plaintext';
  END IF;
END;
$stage09$;
NOTIFY pgrst, 'reload schema';
SELECT 'MEG_STAGE09_VAULT_LOCAL_SYNTHETIC_PASS' AS marker;
SQL

echo 'MEG_STAGE09_RLS_POLICY_LOCAL_CREATED'
