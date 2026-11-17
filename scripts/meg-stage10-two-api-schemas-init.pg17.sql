-- Etapa 10, DEMONSTRACAO DE DUAS APIs COM PRISMA EM PG17 DESCARTAVEL.
-- Use somente no service container GitHub Actions, NUNCA Supabase.
\set ON_ERROR_STOP on
DO $$
BEGIN
 IF current_database()<>'meg_stage10_sandbox'
    OR current_user<>'meg_stage10_ci'
    OR current_setting('application_name',true)<>'MEG_STAGE10_QA_DISPOSABLE_ONLY'
 THEN RAISE EXCEPTION 'STAGE10_QA_DISPOSABLE_ONLY'; END IF;
END $$;
CREATE ROLE stage10_cohort_android_login LOGIN PASSWORD 'QA_ANDROID_DISPOSABLE_ONLY';
CREATE ROLE stage10_cohort_web_login LOGIN PASSWORD 'QA_WEB_DISPOSABLE_ONLY';
CREATE SCHEMA stage10_cohort_android AUTHORIZATION stage10_cohort_android_login;
CREATE SCHEMA stage10_cohort_web AUTHORIZATION stage10_cohort_web_login;
REVOKE ALL ON SCHEMA stage10_cohort_android FROM PUBLIC;
REVOKE ALL ON SCHEMA stage10_cohort_web FROM PUBLIC;
GRANT CONNECT ON DATABASE meg_stage10_sandbox TO stage10_cohort_android_login, stage10_cohort_web_login;
DO $$
BEGIN
 IF has_schema_privilege('stage10_cohort_android_login','stage10_cohort_web','USAGE')
    OR has_schema_privilege('stage10_cohort_web_login','stage10_cohort_android','USAGE')
 THEN RAISE EXCEPTION 'STAGE10_SCHEMA_COHORT_CROSS_PRIVILEGE'; END IF;
END $$;
SELECT 'MEG_STAGE10_PG17_TWO_API_SCHEMAS_CREATED_QA_ONLY' AS result;
