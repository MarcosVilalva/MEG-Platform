#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/home/m_vil/meg-stage11-web-clean-20261125
QA="$ROOT/.qa"
DATA="$QA/pgdata"
SOCK="$QA/socket"
LOG="$QA/logs"
BIN=/usr/lib/postgresql/17/bin
export PGPASSWORD=meg_stage11_disposable_only
cd "$ROOT"
test "$(git branch --show-current)" = stage11/web-foundation-clean-20261125 || { echo WRONG_BRANCH; exit 30; }
git merge-base --is-ancestor d0724e11e05e8068f745882b7c55a5dfa74fbae9 HEAD || { echo BASELINE_NOT_PRESENT; exit 31; }
test ! -e "$DATA" || { echo EXISTING_DATA_GUARD; exit 32; }
if "$BIN/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then echo PORT_IN_USE_GUARD; exit 33; fi
mkdir -p "$QA" "$SOCK" "$LOG"
chmod 700 "$QA" "$SOCK"
cleanup() {
  if test -f "$DATA/PG_VERSION"; then "$BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; fi
  if test -f "$QA/stage11-audit-origin-owner" && test "$DATA" = "$ROOT/.qa/pgdata"; then
    rm -rf -- "$DATA" "$SOCK"
    rm -f -- "$QA/stage11-audit-origin-owner" "$QA/stage11-audit-origin-password"
  fi
  echo STAGE11_AUDIT_ORIGIN_DISPOSABLE_CLUSTER_CLEANUP=COMPLETE
}
trap cleanup EXIT
printf '%s\n' stage11-audit-origin-disposable > "$QA/stage11-audit-origin-owner"
printf '%s\n' "$PGPASSWORD" > "$QA/stage11-audit-origin-password"
chmod 600 "$QA/stage11-audit-origin-password"
"$BIN/initdb" -D "$DATA" -U meg_stage10_ci --auth-local=trust --auth-host=scram-sha-256 --pwfile="$QA/stage11-audit-origin-password" --no-instructions > "$LOG/origin-initdb.log" 2>&1
"$BIN/pg_ctl" -D "$DATA" -l "$LOG/origin-server.log" -o "-c listen_addresses=127.0.0.1 -p 5432 -k $SOCK -c unix_socket_permissions=0700" -w start > "$LOG/origin-start.log" 2>&1
"$BIN/psql" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U meg_stage10_ci -d postgres -c "CREATE ROLE postgres LOGIN SUPERUSER BYPASSRLS;" > "$LOG/origin-role.log" 2>&1
for role in anon authenticated service_role; do
  "$BIN/psql" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U meg_stage10_ci -d postgres -c "CREATE ROLE $role NOLOGIN;" >> "$LOG/origin-role.log" 2>&1
done
"$BIN/createdb" -h 127.0.0.1 -p 5432 -U meg_stage10_ci meg_stage11_first_write_sandbox
export DATABASE_URL="postgresql://meg_stage10_ci:$PGPASSWORD@127.0.0.1:5432/meg_stage11_first_write_sandbox?schema=public"
export GITHUB_ACTIONS=true
export GITHUB_REPOSITORY=MarcosVilalva/MEG-Platform
export MEG_STAGE10_ISOLATED_PG=1
export MEG_STAGE11_FIRST_WRITE_SYNTHETIC=1
export MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED=0
export NODE_ENV=test

# Historical fixture strictly predates the migration. No protected database is touched.
"$BIN/psql" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U meg_stage10_ci -d meg_stage11_first_write_sandbox > "$LOG/origin-history-seed.log" 2>&1 <<'SQL'
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "AuditLog" ("id","userId","entity","entityId","action","metadata","createdAt") VALUES
('stage11-before-audit-1',NULL,'FinancialEvent','stage11-before-audit-1','BEFORE_MIGRATION','{"historic":1}','2025-01-02 03:04:05.000'),
('stage11-before-audit-2',NULL,'FinancialEvent','stage11-before-audit-2','BEFORE_MIGRATION','{"historic":2}','2025-01-03 04:05:06.000');
SQL
"$BIN/psql" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U meg_stage10_ci -d meg_stage11_first_write_sandbox -f packages/database/prisma/stage11-issue699-audit-source-migration.sql > "$LOG/origin-migration.log" 2>&1
echo STAGE11_AUDIT_ORIGIN_SQL_MIGRATION=PASS
npx prisma db push --schema packages/database/prisma/schema.prisma --skip-generate > "$LOG/origin-db-push.log" 2>&1
echo STAGE11_AUDIT_ORIGIN_SCHEMA_QA=PASS
./node_modules/.bin/tsx apps/api/src/modules/finance/stage11-audit-source.pg17.disposable.test.ts > "$LOG/origin-test.log" 2>&1 || { tail -n 65 "$LOG/origin-test.log"; echo STAGE11_AUDIT_SOURCE_TEST=FAIL; exit 42; }
grep 'STAGE11_AUDIT_' "$LOG/origin-test.log"
./node_modules/.bin/tsx apps/api/src/modules/finance/stage11-first-write-behavior.pg17.disposable.test.ts > "$LOG/origin-firstwrite.log" 2>&1 || { tail -n 65 "$LOG/origin-firstwrite.log"; echo STAGE11_FIRST_WRITE_TEST=FAIL; exit 43; }
grep 'STAGE11_FIRST_WRITE_' "$LOG/origin-firstwrite.log"
echo STAGE11_AUDIT_ORIGIN_ALL_QA=PASS
