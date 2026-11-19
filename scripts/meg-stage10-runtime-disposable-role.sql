-- MANUAL CI-ONLY. Never run against Windows meg_stage10_qa or Supabase.
-- Applied only after Prisma creates the schema in a disposable GitHub Actions PG17.
DO $stage10$
BEGIN
  IF current_database() <> 'meg_stage10_runtime_sandbox'
    OR current_user <> 'meg_stage10_ci_admin'
    OR (
      inet_server_addr() = '127.0.0.1'::inet
      OR (
        -- GitHub Actions maps host loopback to a private Docker bridge.
        -- Require both endpoints in the same /24, not any private client.
        inet_server_addr() <<= '172.16.0.0/12'::cidr
        AND inet_client_addr() <<= '172.16.0.0/12'::cidr
        AND network(set_masklen(inet_server_addr(), 24)) =
            network(set_masklen(inet_client_addr(), 24))
      )
    ) IS NOT TRUE
    OR current_setting('port') <> '5432'
  THEN
    RAISE EXCEPTION 'STAGE10_DISPOSABLE_ROLE_GUARD_REJECTED';
  END IF;
END
$stage10$;

CREATE ROLE meg_stage10_ci_runtime
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD 'stage10_ci_runtime_disposable_only';

-- Read-only scope sufficient for GET /app-state/revision; no user table access.
GRANT CONNECT ON DATABASE meg_stage10_runtime_sandbox TO meg_stage10_ci_runtime;
GRANT USAGE ON SCHEMA public TO meg_stage10_ci_runtime;
GRANT SELECT ON TABLE
  public."Workspace",
  public."WorkspaceMember",
  public."AppState"
TO meg_stage10_ci_runtime;

DO $stage10$
BEGIN
  IF NOT has_table_privilege('meg_stage10_ci_runtime', 'public."Workspace"', 'SELECT')
    OR NOT has_table_privilege('meg_stage10_ci_runtime', 'public."WorkspaceMember"', 'SELECT')
    OR NOT has_table_privilege('meg_stage10_ci_runtime', 'public."AppState"', 'SELECT')
    OR has_table_privilege('meg_stage10_ci_runtime', 'public."FinancialEvent"', 'SELECT')
    OR has_table_privilege('meg_stage10_ci_runtime', 'public."AppState"', 'INSERT, UPDATE, DELETE')
    OR EXISTS (
      SELECT 1 FROM pg_roles
      WHERE rolname = 'meg_stage10_ci_runtime'
        AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    )
  THEN
    RAISE EXCEPTION 'STAGE10_RUNTIME_LEAST_PRIVILEGE_FAILED';
  END IF;
END
$stage10$;
