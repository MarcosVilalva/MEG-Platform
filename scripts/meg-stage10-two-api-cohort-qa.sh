#!/usr/bin/env bash
# TEST ONLY: duas instancias Prisma/Fastify em PG17 de GitHub Actions.
# Nunca executar em Supabase, Render ou banco real.
set -euo pipefail

node -e "const u=new URL(process.env.DATABASE_URL);if(u.hostname!=='127.0.0.1'||u.pathname!=='/meg_stage10_sandbox'||u.username!=='meg_stage10_ci'||process.env.MEG_STAGE10_ISOLATED_PG!=='1'||process.env.PGAPPNAME!=='MEG_STAGE10_QA_DISPOSABLE_ONLY')process.exit(1)"

pg_admin() {
  psql -h 127.0.0.1 -p 5432 -U meg_stage10_ci -d meg_stage10_sandbox -v ON_ERROR_STOP=1 "$@"
}

cleanup() {
  if [[ -n "${barrier_dir:-}" && "${barrier_dir}" == /tmp/meg-stage10-cohorts.* ]]; then
    rm -rf -- "${barrier_dir}"
  fi
  pg_admin <<'SQL'
DO $$
BEGIN
 IF current_database()<>'meg_stage10_sandbox'
 OR current_user<>'meg_stage10_ci'
 OR current_setting('application_name',true)<>'MEG_STAGE10_QA_DISPOSABLE_ONLY' THEN
  RAISE EXCEPTION 'STAGE10_QA_DISPOSABLE_ONLY';
 END IF;
END $$;
DROP SCHEMA IF EXISTS stage10_cohort_android CASCADE;
DROP SCHEMA IF EXISTS stage10_cohort_web CASCADE;
REVOKE CONNECT ON DATABASE meg_stage10_sandbox FROM stage10_cohort_android_login,stage10_cohort_web_login;
DROP ROLE IF EXISTS stage10_cohort_android_login;
DROP ROLE IF EXISTS stage10_cohort_web_login;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('stage10_cohort_android','stage10_cohort_web'))
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('stage10_cohort_android_login','stage10_cohort_web_login'))
 THEN RAISE EXCEPTION 'STAGE10_QA_COHORT_LEFTOVERS'; END IF;
END $$;
SELECT 'MEG_STAGE10_QA_TWO_API_COHORTS_CLEANED' AS result;
SQL
}
trap cleanup EXIT

pg_admin -f scripts/meg-stage10-two-api-schemas-init.pg17.sql

# Primeiro aplica schema separadamente, ainda sem processo Fastify.
for cohort in android web; do
  if [ "$cohort" = android ]; then
    QA_DB_ROLE='stage10_cohort_android_login'
    QA_DB_PASSWORD='QA_ANDROID_DISPOSABLE_ONLY'
  else
    QA_DB_ROLE='stage10_cohort_web_login'
    QA_DB_PASSWORD='QA_WEB_DISPOSABLE_ONLY'
  fi
  DATABASE_URL="postgresql://${QA_DB_ROLE}:${QA_DB_PASSWORD}@127.0.0.1:5432/meg_stage10_sandbox?schema=stage10_cohort_${cohort}" \
    npx prisma db push --schema packages/database/prisma/schema.prisma --skip-generate
done

# Duas instancias Fastify simultaneas, com barreira de 3 fases (ready,
# insert e update). Nunca compartilham usuario, URL Prisma ou schema.
barrier_dir="$(mktemp -d /tmp/meg-stage10-cohorts.XXXXXX)"
export MEG_STAGE10_CONCURRENT_BARRIER_DIR="$barrier_dir"

(
  export MEG_STAGE10_COHORT=android
  export DATABASE_URL='postgresql://stage10_cohort_android_login:QA_ANDROID_DISPOSABLE_ONLY@127.0.0.1:5432/meg_stage10_sandbox?schema=stage10_cohort_android'
  npx tsx apps/api/src/modules/finance/stage10-two-api-cohort.isolated.test.ts
) &
android_pid=$!
(
  export MEG_STAGE10_COHORT=web
  export DATABASE_URL='postgresql://stage10_cohort_web_login:QA_WEB_DISPOSABLE_ONLY@127.0.0.1:5432/meg_stage10_sandbox?schema=stage10_cohort_web'
  npx tsx apps/api/src/modules/finance/stage10-two-api-cohort.isolated.test.ts
) &
web_pid=$!

# Aguarda os dois retornos. Mesmo que um falhe, aguarda o outro para que
# cleanup nao destrua schemas durante query de um processo ainda vivo.
set +e
wait "$android_pid"
android_exit=$?
wait "$web_pid"
web_exit=$?
set -e
if [ "$android_exit" -ne 0 ] || [ "$web_exit" -ne 0 ]; then
  echo "MEG_STAGE10_TWO_FASTIFY_PROCESSES_FAILED android=$android_exit web=$web_exit" >&2
  exit 1
fi
echo 'MEG_STAGE10_TWO_FASTIFY_CONCURRENT_BARRIERS_PASS'

# Nenhuma credencial do teste sobrevive fora deste shell ou sera exportada.
unset QA_DB_ROLE QA_DB_PASSWORD MEG_STAGE10_CONCURRENT_BARRIER_DIR
