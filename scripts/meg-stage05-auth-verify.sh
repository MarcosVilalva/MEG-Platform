#!/usr/bin/env bash
set +e
STATUS=0
DIR="artifacts/meg-stage05-auth"
mkdir -p "$DIR"
: > "$DIR/results.txt"
run(){ label="$1"; shift; printf '\n==== %s ====\n' "$label"; "$@"; code=$?; printf '%s: %s\n' "$label" "$code" | tee -a "$DIR/results.txt"; if [ "$code" -ne 0 ]; then STATUS=1; fi; }
run db-generate npm run db:generate
run auth npm run test:auth
run finance npm run test:finance
run core npm run test:core
run evolution-data npm run test:evolution-data
run shell npm run test:web-evolution-shell
run datagrid npm run test:web-evolution-datagrid
run login-contract node apps/web/src/meg-web-evolution/auth/login.contract.test.mjs
run build-web npm run build:web
run build-api npm run build:api
VITE_API_URL=http://127.0.0.1:4173 VITE_PUBLIC_BASE_PATH=/ npm --workspace apps/web run dev -- --host 127.0.0.1 --port 4173 > "$DIR/vite.log" 2>&1 &
SERVER_PID=$!
for i in $(seq 1 40); do curl -fsS http://127.0.0.1:4173/web-evolution.html > /dev/null 2>&1 && break; sleep 1; done
run login-playwright npx playwright test apps/web/src/meg-web-evolution/auth/login.playwright.spec.mjs --workers=1 --reporter=line
for screen in register recover loading; do
  spec="apps/web/src/meg-web-evolution/auth/$screen.playwright.spec.mjs"
  if [ -f "$spec" ]; then run "$screen-playwright" npx playwright test "$spec" --workers=1 --reporter=line; fi
done
kill "$SERVER_PID" 2>/dev/null || true
printf '\nGATE FINAL: %s\n' "$STATUS"
exit "$STATUS"
