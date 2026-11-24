#!/usr/bin/env bash
set -Eeuo pipefail
wt=/home/m_vil/meg-stage10-final-integration-20261121
pgbin=/usr/lib/postgresql/17/bin
port=55439
pgroot=''
started=0
log="$wt/MEG-ETAPA10-PT41-INTEGRACAO-20261121.log"
exec > >(tee -a "$log") 2>&1
cleanup() {
  local rc=$?
  trap - EXIT
  if [[ "$started" == 1 ]]; then
    "$pgbin/pg_ctl" -D "$pgroot/data" -m fast -w stop >/dev/null 2>&1 || rc=92
  fi
  if [[ -n "$pgroot" && "$pgroot" == /home/m_vil/meg-stage10-final-pg.* ]]; then
    rm -rf -- "$pgroot"
  fi
  if "$pgbin/pg_isready" -q -h 127.0.0.1 -p "$port"; then
    echo "DISPOSABLE_PG_CLEANUP=FAIL_LISTENER"
    rc=93
  else
    echo "DISPOSABLE_PG_CLEANUP=PASS"
  fi
  echo "PT41_SCRIPT_EXIT=$rc"
  exit "$rc"
}
trap cleanup EXIT
echo "PT41=WEB_API_POSTGRES_ISOLATED"
echo "SOURCE_WORKTREE=$wt"
[[ "$(id -u)" != 0 ]] || { echo "BLOCKED_ROOT_USER"; exit 81; }
[[ -f "$wt/apps/api/src/modules/finance/stage10-final-web-api-pg17.isolated.test.ts" ]] || exit 82
[[ ! -e "$wt/packages/database/.env" && ! -e "$wt/node_modules/@meg/database/.env" ]] || { echo "BLOCKED_DOTENV"; exit 83; }
if "$pgbin/pg_isready" -q -h 127.0.0.1 -p "$port"; then
  echo "BLOCKED_PORT_IN_USE"; exit 84
fi
pgroot="$(mktemp -d /home/m_vil/meg-stage10-final-pg.XXXXXX)"
mkdir -p "$pgroot/socket"
"$pgbin/initdb" -D "$pgroot/data" -U meg_stage10_final --auth-local=trust --auth-host=trust --no-instructions >"$pgroot/initdb.log" 2>&1
"$pgbin/pg_ctl" -D "$pgroot/data" -l "$pgroot/postgres.log" -o "-c listen_addresses=127.0.0.1 -c port=$port -c unix_socket_directories=$pgroot/socket" -w start
started=1
"$pgbin/createdb" -h "$pgroot/socket" -p "$port" -U meg_stage10_final meg_stage10_final_disposable
echo "POSTGRES_DISPOSABLE=STARTED"
export DATABASE_URL="postgresql://meg_stage10_final:synthetic-only@127.0.0.1:$port/meg_stage10_final_disposable"
export NODE_ENV=test
export CORS_ORIGINS=http://127.0.0.1:4173
export JWT_SECRET=stage10-final-fictitious-local-test-secret
export MEG_STAGE10_FINAL_DISPOSABLE=1
export WSLENV="${WSLENV:+$WSLENV:}DATABASE_URL/w:NODE_ENV/w:CORS_ORIGINS/w:JWT_SECRET/w:MEG_STAGE10_FINAL_DISPOSABLE/w"
winroot="$(wslpath -w "$wt")"
echo "EXECUTING_WINDOWS_NODE_USING_TEMP_MAPPED_DRIVE"
cmd.exe /d /c "pushd $winroot && node node_modules\\prisma\\build\\index.js db push --schema packages\\database\\prisma\\schema.prisma && popd"
echo "PRISMA_DISPOSABLE_SCHEMA=PASS"
cmd.exe /d /c "pushd $winroot && node node_modules\\tsx\\dist\\cli.mjs apps\\api\\src\\modules\\finance\\stage10-final-web-api-pg17.isolated.test.ts && popd"
echo "PT41_INTEGRATION_GATE=PASS"
