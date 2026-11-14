#!/usr/bin/env bash
# Etapa 09: Build seguro da API Render. Nunca migrar nem modificar o banco aqui.
# Uso futuro, APENAS após aprovação operacional e backup/DR:
#   bash scripts/meg-stage09-render-api-build.sh
set -Eeuo pipefail
cd "$(dirname "$0")/.."

npm ci --include=dev --audit=false --fund=false
npm run db:generate
npm run build:api

echo 'MEG_STAGE09_SAFE_BUILD=BUILT_WITHOUT_DATABASE_SCHEMA_ACTIONS'
