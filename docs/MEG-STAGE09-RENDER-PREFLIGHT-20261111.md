# MEG Finanças Web Evolution — Etapa 09 — Pré-validação do Build Command do Render
**Atualização: 11/11/2026. Estado: PR de segurança isolada, somente teste OFFLINE. Nenhuma alteração em Render, Supabase, banco, main, Android ou API financeira.**

## 1. Diagnóstico atualizado na origem, somente leitura
- Render API: serviço \`meg-platform-api\`, ID \`srv-d98k61daeets7384hvb0\`, workspace \`tea-d98k1qhkh4rs73f4sfj0\`. Branch vinculada \`main\`. **Auto Deploy: ON, On Commit**. Build filter: \`apps/api/**\`, \`packages/database/**\`, \`package.json\` e \`package-lock.json\`.
- Deploy LIVE no momento da consulta: \`dep-dbm92b17lnhs738s0jr0\`, commit \`28703a95310c9b9b5f193ef4f3a0cbe80e121f07\`, de 05/11/2026. É metadado momentâneo; reconferir antes de qualquer intervenção.
- Build Command REAL configurado no Render (não alterado):

\`\`\`bash
npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production
\`\`\`

- \`db:prepare:production\` pode efetuar \`DELETE FROM "Budget"\`. \`db:push:production\` roda \`prisma db push --accept-data-loss\`, seguido de manutenção de índices. Não executar qualquer deploy com essa configuração.
- O último backup recuperável de produção **NÃO existe comprovadamente**: a PR #666 criou kit de exportação e restaurou banco fictício no CI, mas ainda falta dump verdadeiro, cópia cifrada offsite, proteção Vault e restauro real. Sem isso, **NO-GO de config/deploy**.

## 2. O que esta PR realmente acrescenta
- \`scripts/meg-stage09-render-build-contract.mjs\` valida o **candidato exato**, além de todas as cadeias de npm scripts próprias do repositório executadas por \`db:generate\` e \`build:api\` e de hooks de instalação/build que alterariam a avaliação. Não executa comando, não lê produção, não chama Render.
- \`scripts/meg-stage09-render-build-contract.test.mjs\`: caracteriza rejeição do comando perigoso atualmente LIVE, \`db push\`, \`--accept-data-loss\`, mudança oculta em \`db:generate\`, hooks \`postinstall\`/\`prebuild\` e desvio da instalação travada \`npm ci\`.
- \`.github/workflows/meg-stage09-render-build-safety.yml\`: executa teste offline e reproduz o build candidato com \`DATABASE_URL\` fictícia apontando para \`127.0.0.1:1\`, sem qualquer credencial de produção. **Não faz deploy, migração ou seed.**
- **Limitação honesta:** o contrato não consegue inspecionar diretamente as configurações LIVE de Render e não prova que bibliotecas terceiras não possuem efeitos colaterais durante \`npm ci\`. A configuração ativa deve ser confirmada separadamente via API/Settings após autorização futura. Também não garante que o novo build, isoladamente, corrigirá Egress.
- **Não adotar um render.yaml Blueprint automaticamente:** o serviço existente é gerenciado no Render, e introduzir Blueprint pode trazer alterações não desejadas à configuração.

## 3. Build Command candidato, não aplicado
\`\`\`bash
npm ci --audit=false && npm run db:generate && npm run build:api
\`\`\`
- \`npm ci --audit=false\`: instala conforme \`package-lock.json\`; mantém comportamento de scripts de dependências conforme npm. Requer conferência adicional dos logs de build.
- \`npm run db:generate\`: cadeia \`npm --workspace packages/database run db:generate\` → \`prisma generate\`, gera cliente local.
- \`npm run build:api\`: cadeia \`npm --workspace apps/api run build\` → \`tsc -p tsconfig.json\`, compila API.
- **Sem** \`db:prepare:production\`, \`db:push:production\`, \`db:seed\`, \`db:migrate\`, \`--accept-data-loss\`, \`prisma migrate\`, \`prisma db push\` na cadeia controlada. Não alterar \`Start Command = npm run start:api\`, \`branch=main\`, health \`/health\`.

## 4. Plano de troca segura, SOMENTE APÓS backup/restore comprovado
1. Validar dois backups cifrados em mídias diferentes, identidade age sob guarda segura, chave Vault separada, e restauração **real** de \`public\` no PostgreSQL 17 isolado. Plano de recuperar demais recursos Supabase deve estar documentado. Conferir PR #666.
2. Confirmar a quitação da restrição de Egress (ou decisão explícita de plano), integridade e saúde da API. Validar checks dos SHAs exatos #663, #665, #656 separadamente.
3. Planejar janela e operador, registrar config atual, último LIVE SHA/deploy, opções efetivas de rollback e status de usuários. Congelar merges da \`main\`.
4. Na interface Render, **desabilitar Auto Deploy primeiro** e conferir em Events/Deploys. Como alteração de settings pode disparar deploy, agir sob autorização explícita de janela, interrompendo caso inicie build inesperado.
5. Substituir somente Build Command pelo candidato exato; conferir texto, salvar, monitorar logs. **Caso salvar inicie deploy sem autorização específica, suspender e avaliar imediatamente.** Não deixar comando destrutivo como rollback de configuração.
6. Qualquer publicação subsequente exige aprovação específica. Após publicar, verificar logs sem migrations, \`/health\`, CORS, auth, isolamento, sem writers inesperados. Rollback aplica artefato anterior e **não recupera alterações de banco**.
7. Reavaliar Auto Deploy, considerando **Off** ou **After CI Checks Pass** apenas após controle de implantação. Render considera \`skipped\` como status aprovado em CI, portanto **After CI não é substituto de gates financeiros/visuais explícitos**.

Referência operacional anterior: [runbook Stage09 Render](https://github.com/MarcosVilalva/MEG-Platform/blob/stage09/pt4-auditoria-sem-deploy-20261109/docs/MEG-STAGE09-RENDER-BUILD-SAFE-CHANGE-RUNBOOK-20261110.md).
Fontes: https://render.com/docs/deploys ; https://render.com/docs/rollbacks .

## 5. Resultado a ser registrado
- [ ] PR Draft com script, teste, CI e docs em branch isolada
- [ ] Testes offline e build candidatos verdes no SHA final
- [ ] **Backup real recuperável** (gate externo, pendente)
- [ ] **Alteração da configuração Render** (não autorizada/pendente)
- [ ] **Deploy da API** (não autorizado/pendente)
- [ ] **Validação visual de Lançamentos e integração financeira** (não substituída por CI)

**Etapa 09 continua ABERTA e NO-GO em produção.**
