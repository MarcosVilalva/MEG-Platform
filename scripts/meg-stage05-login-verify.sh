#!/usr/bin/env bash
# Executar apenas em clone completo do repositório, depois de instalar dependências.
# Continua os testes mesmo quando algum falha; sai com erro no fim se qualquer falhar.
set +e
STATUS=0
mkdir -p artifacts/meg-web-stage05-login
run() {
  label="$1"; shift
  printf '\n===== %s =====\n' "$label"
  "$@"
  code=$?
  printf '%s: %s\n' "$label" "$code" | tee -a artifacts/meg-web-stage05-login/results.txt
  if [ "$code" -ne 0 ]; then STATUS=1; fi
}
run 'generate-db-client' npm run db:generate
run 'auth' npm run test:auth
run 'finance' npm run test:finance
run 'core' npm run test:core
run 'evolution-data' npm run test:evolution-data
run 'shell' npm run test:web-evolution-shell
run 'datagrid' npm run test:web-evolution-datagrid
run 'login-contract' node apps/web/src/meg-web-evolution/auth/login.contract.test.mjs
run 'login-background-2x' node scripts/meg-stage05-login-background-2x.mjs
run 'build-web' npm run build:web
run 'build-api' npm run build:api
VITE_API_URL=http://127.0.0.1:4173 VITE_PUBLIC_BASE_PATH=/ npm --workspace apps/web run dev -- --host 127.0.0.1 --port 4173 > artifacts/meg-web-stage05-login/vite.log 2>&1 &
SERVER_PID=$!
for i in $(seq 1 40); do curl -fsS http://127.0.0.1:4173/web-evolution.html >/dev/null 2>&1 && break; sleep 1; done
run 'login-playwright' npx playwright test apps/web/src/meg-web-evolution/auth/login.playwright.spec.mjs --workers=1 --reporter=line
kill "$SERVER_PID" 2>/dev/null || true
printf '\nGATE FINAL: %s\n' "$STATUS"
exit "$STATUS"
