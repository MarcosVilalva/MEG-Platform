-- MEG Etapa 10 | PROVA DE ISOLAMENTO DE ESCRITORES SOMENTE EM PG17 QA.
-- Nao aplica migracao no Supabase, nao cria roles em producao.
-- O mesmo cluster descartavel guarda dois schemas e roles sem permissoes cruzadas.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
 IF current_database() <> 'meg_stage10_sandbox'
   OR current_user <> 'meg_stage10_ci'
   OR current_setting('application_name', true) <> 'MEG_STAGE10_QA_DISPOSABLE_ONLY'
 THEN RAISE EXCEPTION 'STAGE10_QA_DISPOSABLE_ONLY'; END IF;
END $$;
CREATE ROLE stage10_qa_android_writer NOLOGIN NOINHERIT;
CREATE ROLE stage10_qa_web_writer NOLOGIN NOINHERIT;
CREATE SCHEMA stage10_qa_android AUTHORIZATION stage10_qa_android_writer;
CREATE SCHEMA stage10_qa_web AUTHORIZATION stage10_qa_web_writer;
-- Fixtures simplificadas, nao clonam a autoridade financeira. O objetivo
-- e provar ausencia de permissionamento cruzado entre escritores.
SET LOCAL ROLE stage10_qa_android_writer;
CREATE TABLE stage10_qa_android."FinancialEvent" (
 id text PRIMARY KEY, "workspaceId" text NOT NULL, amount numeric(18,2) NOT NULL
);
INSERT INTO stage10_qa_android."FinancialEvent" VALUES ('same-id','ws-qa',100.15);
RESET ROLE;
SET LOCAL ROLE stage10_qa_web_writer;
CREATE TABLE stage10_qa_web."FinancialEvent" (
 id text PRIMARY KEY, "workspaceId" text NOT NULL, amount numeric(18,2) NOT NULL
);
INSERT INTO stage10_qa_web."FinancialEvent" VALUES ('same-id','ws-qa',100.15);
RESET ROLE;

-- Um writer legado pode editar apenas seu proprio schema.
SET LOCAL ROLE stage10_qa_android_writer;
UPDATE stage10_qa_android."FinancialEvent" SET amount=101.15 WHERE id='same-id';
DO $$
BEGIN
 BEGIN
  UPDATE stage10_qa_web."FinancialEvent" SET amount=999999 WHERE id='same-id';
  RAISE EXCEPTION 'STAGE10_CROSS_TENANT_WRITE_UNEXPECTEDLY_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM amount FROM stage10_qa_web."FinancialEvent" WHERE id='same-id';
  RAISE EXCEPTION 'STAGE10_CROSS_TENANT_READ_UNEXPECTEDLY_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;

SET LOCAL ROLE stage10_qa_web_writer;
UPDATE stage10_qa_web."FinancialEvent" SET amount=102.15 WHERE id='same-id';
DO $$
BEGIN
 BEGIN
  DELETE FROM stage10_qa_android."FinancialEvent" WHERE id='same-id';
  RAISE EXCEPTION 'STAGE10_CROSS_ANDROID_DELETE_UNEXPECTEDLY_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM amount FROM stage10_qa_android."FinancialEvent" WHERE id='same-id';
  RAISE EXCEPTION 'STAGE10_CROSS_ANDROID_READ_UNEXPECTEDLY_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;

DO $$
BEGIN
 IF (SELECT amount FROM stage10_qa_android."FinancialEvent" WHERE id='same-id') <> 101.15
 OR (SELECT amount FROM stage10_qa_web."FinancialEvent" WHERE id='same-id') <> 102.15
 OR (SELECT count(*) FROM stage10_qa_android."FinancialEvent") <> 1
 OR (SELECT count(*) FROM stage10_qa_web."FinancialEvent") <> 1
 THEN RAISE EXCEPTION 'STAGE10_QA_ISOLATION_INVARIANT_FAILED'; END IF;
 IF has_schema_privilege('stage10_qa_web_writer','stage10_qa_android','USAGE')
 OR has_schema_privilege('stage10_qa_android_writer','stage10_qa_web','USAGE')
 THEN RAISE EXCEPTION 'STAGE10_QA_UNEXPECTED_CROSS_SCHEMA_GRANT'; END IF;
END $$;
SELECT 'MEG_STAGE10_QA_WRITER_ISOLATION_BOTH_DIRECTIONS_PASS' AS result;
ROLLBACK;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('stage10_qa_web','stage10_qa_android'))
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('stage10_qa_web_writer','stage10_qa_android_writer'))
 THEN RAISE EXCEPTION 'STAGE10_QA_ROLES_OR_SCHEMAS_PERSISTED'; END IF;
END $$;
SELECT 'MEG_STAGE10_QA_WRITER_ISOLATION_ROLLBACK_ZERO_RESIDUES_PASS' AS result;
