#!/usr/bin/env bash
# Compilacao apenas. Aplicacao no Render depende dos gates e autorizacao.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
node scripts/meg-stage09-render-api-build.contract.test.mjs

# Nunca entregar a URL produtiva aos comandos de compilacao.
export DATABASE_URL='postgresql://build:build@127.0.0.1:65431/meg_stage09_build_only?schema=public'
export npm_config_ignore_scripts=true

npm ci --include=dev --ignore-scripts --audit=false --fund=false
npm run --ignore-scripts db:generate
npm run --ignore-scripts build:api

echo 'MEG_STAGE09_SAFE_BUILD=BUILT_WITHOUT_DATABASE_SCHEMA_ACTIONS'
