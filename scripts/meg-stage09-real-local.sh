#!/usr/bin/env bash
set -euo pipefail

# MEG WEB ETAPA 09 | Dados reais, somente leitura, em Codespaces/local.
# Não faz migração de banco, não grava lançamento e não libera alterações.
# Mantenha a porta encaminhada PRIVADA no GitHub Codespaces.
branch="$(git branch --show-current)"
if [[ "$branch" != "preview/09-lancamentos-20261104" ]]; then
  echo "Etapa nao autorizada: branch atual '$branch'."
  echo "Altere para preview/09-lancamentos-20261104 antes de executar."
  exit 1
fi
export VITE_API_URL=''
export VITE_PUBLIC_BASE_PATH='/'
export MEG_STAGE09_UPSTREAM_API='https://meg-platform-api.onrender.com'
export PORT="${PORT:-4178}"

npm ci --audit=false
npm run db:generate
(
 cd apps/web
 npx vite build --base /
)
echo ""
echo "MEG Etapa 09: gateway autenticado somente leitura na porta $PORT"
echo "No Codespaces: abra a aba PORTAS, mantenha $PORT PRIVADA e acesse o link HTTPS."
echo "Rota: /web-evolution.html?tela=lancamentos"
echo "Use sua conta MEG existente no navegador. NAO envie senha no chat."
exec node scripts/meg-stage09-readonly-gateway.mjs
