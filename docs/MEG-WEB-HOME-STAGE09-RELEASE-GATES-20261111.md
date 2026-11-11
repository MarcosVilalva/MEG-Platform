# MEG Web Evolution — Continuidade Home → Lançamentos e gates de publicação

**Data:** 11/11/2026 (horário de Brasília)  
**Escopo:** plano técnico, sem merge, sem deploy, sem alterações de UI, API, Android, Supabase ou dados.  
**Fonte:** consulta de leitura aos PRs, GitHub Actions, arquivos de autoridade, handoff Etapa 09 e metadados Render em 11/11/2026. Conferir novamente SHA/status antes de executar qualquer gate.

## 1. Decisões e estado visual

- O usuário aceitou a **revisão visual #9 da Home** dizendo “FICOU BOM, MAIS PARA FRENTE MEXEMOS MAIS NELA”. Congelar a revisão #9 para integração; refinamentos estéticos adicionais ficam para intervenção futura, mediante autorização.
- Prévia fictícia da revisão visual aceita: `https://meg-home-p0-qa-pr669.onrender.com/fluxo-integrado-08.html?tela=home-p0&v=ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3`.
- Gates de código da revisão: integração #43115777636 (SHA `eaf1a880ac1078b588e339b4717baa544c21fcf1`) e QA #43115932970 (SHA `ec521dd3cf8af1c2327cc4ca27c4900d8fbe1fe3`) com sucesso; QA Render LIVE `dep-dbqf6go54qbs73emhsb0`. O HEAD documental posterior não reexecutou esses gates; não confundir documentação com prova de compilação de código novo.
- Visual aprovado **não** autoriza publicação produtiva, merge nem promoção de serviços; não repetir homologação visual anterior como teste financeiro.
- Cinco pontos visuais da Etapa 09 Lançamentos foram explicitamente homologados no checkpoint de 09/11, mas as operações reais e a publicação seguem pendentes.

## 2. Inventário e dependências verificadas

| PR | Escopo | Base → head | Estado |
|---|---|---|---|
| #649 | Telas de Loading/Login/Cadastro/Recuperação visual | `main` → `meg-web-evolution/07-revisao-visual-loading-20261027` | Open, Draft |
| #654 | Fluxo Web integrado | `meg-web-evolution/06-home-reinicio-20261030` → `preview/08-fluxo-componentes-reais-20261103` | Open, Draft |
| #655 | Home refinada | `preview/08-fluxo-componentes-reais-20261103` → `preview/06-home-refino-preservado-20261104` | Open, Draft |
| #664 | Ações rápidas personalizáveis, persistência local por usuário | `preview/06-home-refino-preservado-20261104` → `preview/08-home-acoes-customizaveis-20261110` | Open, Draft |
| #668 | Endpoint canônico de compromissos em leitura | `preview/08-home-acoes-customizaveis-20261110` → `audit/08-home-p0-overdue-read-20261110` | Open, Draft |
| #669 | Integração Home P0, alertas e revisão #9 | `audit/08-home-p0-overdue-read-20261110` → `integration/08-home-p0-canonical-20261111` | Open, Draft |
| #656 | Lançamentos visual homologado, sem writes operacionais | `preview/06-home-refino-preservado-20261104` → `preview/09-lancamentos-20261104` | Open, Draft |
| #663 | API Stage09, snapshot e indicadores read-only | `main` → `stage09-api-readonly-release-20261109` | Open, Draft |
| #670 | Preflight do Build Command seguro somente offline | `main` → `stage09/render-api-build-guard-20261111` | Open, Draft |
| #666 | Kit backup cifrado e restauração isolada | `main` → `stage09/backup-recovery-kit-20261110` | Open, Draft; tratado pelo usuário em outro chat |

**Não inferir possibilidade de integração apenas por `mergeable=true`.** PRs empilhadas herdaram código de bases anteriores e #656 é uma linha paralela à #664 → #668 → #669. A ordem de PR numérica não define a ordem de merge.

## 3. Sobreposição de arquivos que exige conciliação antes de integrar

- `apps/api/src/modules/finance/routes.ts`: modificado na #668 (Home), #663 (API Stage09) e #656 (Web Lançamentos). Exigir integração manual que preserve as rotas, autenticação, tenant/workspace, contratos HTTP e política canônica. Nunca sobrescrever uma rota pela outra.
- `apps/api/src/modules/finance/history-filter.ts` e `service.ts`: alterações em #663 e #656. Verificar equivalência e ausência de mutações.
- `apps/web/src/meg-web-evolution/datagrid/DataGrid.tsx`, `datagrid/types.ts` e `main.tsx`: alterações em #664 e #656. Preservar filtros, paginação, cards responsivos, customização local e a revisão #9.
- `AppShell.tsx`: alterado em #669 e #656. Garantir autenticador, período, contexto, navegação e logout.
- `MEG-WEB-CONTINUIDADE-OFICIAL.md`: histórico acumulado em várias branches. Reconciliar **aditivamente** sem apagar decisões/aceites ou substituir checkpoint por versão antiga.

**Procedimento:** criar branch de integração descartável baseada na autoridade aprovada da Web, inventariar patches de cada PR, aplicar as mudanças em ordem explícita, inspecionar conflitos, rodar todos os gates e comparar visuais oficiais. Nenhum merge em `main` ou alteração em Render até autorização posterior.


### 3.1. Evidência de auditoria dos patches, sem executar integração

A comparação efetiva dos patches confirmou que não se trata apenas de arquivos repetidos:

1. **`finance/routes.ts`:** #668 adiciona a rota de leitura de compromissos `GET /home-commitments`, enquanto #663 adiciona `GET /events/history-snapshot`, `GET /events/filtered-summary` e a revisão ativa do histórico ao `sync-status`. #656 acrescenta as duas rotas de histórico e `capabilities`, mas **não carrega a mesma revisão ativa do token** presente em #663. No código integrado, preservar as três rotas e a revisão de sincronização, sem registros duplicados nem perda de proteção por workspace.
2. **`history-filter.ts`:** #663 contém fallback de rótulos históricos provenientes de `sourcePayload` e de `importedRow.rawData`, ao passo que a versão paralela de #656 consultava apenas o `importedRow.rawData` nessa função auxiliar. Não substituir a implementação posterior pela versão antiga: testar categorias e formas de pagamento históricas sem IDs, preservando texto e seleção sem alterar valores.
3. **`AppShell.tsx`:** #669 introduz `HomeDueAlertsProvider`, sino de vencimentos canônicos e `periodLabel`; #656 inclui navegação autenticada Home↔Lançamentos, perfil dinâmico e `onLogout/logoutPending`. A implementação final deve **compor as duas interfaces de props e o provider**, sem perder revogação de sessão, autenticação, alertas, acessibilidade, logout ou período. Regressão específica de início/sair/retorno e sino no desktop e mobile obrigatória.

Esses achados são evidências de risco de integração, **não** afirmação de falha executada na aplicação. Nenhuma correção foi aplicada nesta auditoria de leitura.

## 4. Dependência de segurança no Render, bloqueio P0

- Serviço de API **`meg-platform-api`**, ID `srv-d98k61daeets7384hvb0`, branch `main`, Auto Deploy **ON**. SHA LIVE observado `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`, deploy `dep-dbm92b17lnhs738s0jr0`.
- Build Command LIVE, confirmado pelo `get_service` em `serviceDetails.envSpecificDetails.buildCommand`:
  `npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production`.
- `db:prepare:production` pode executar `DELETE FROM "Budget"`; `db:push:production` envolve `prisma db push --accept-data-loss`. **NÃO acionar deploy, redeploy ou merge com esse build ativo.**
- A PR #670 possui gate offline aprovado no SHA `9eefe5193b99bc036b1e8303ecc1af604446fb29`: workflow #42956805822 e MEG Platform CI #42956805830 `success`. **Isso NÃO prova configuração segura no Render**.
- Candidato documental, ainda **não aplicado**: `npm ci --audit=false && npm run db:generate && npm run build:api`.
- Trocar Settings no Render pode iniciar publicação. Exigir backup cifrado REAL, cópias externas, guarda de chaves, restore REAL isolado e registro de cobertura do escopo, aprovação explícita do operador, janela, Auto Deploy controlado, revisão de SHA e plano de recuperação antes de tocar configuração. Conferir também situação de Egress/quotas.
- A PR #666 é conduzida **em outro chat**. **Não executar backup, dump, restore, alterações de scripts, conexão Supabase ou modificação dessa PR neste fluxo.** Consumir somente seu resultado de gate quando for verificado objetivamente.

## 5. Sequência operacional recomendada (sem atalhos)

1. **Preservar visual**: congelar Home #9 e os cinco pontos de Lançamentos. Não iniciar novo redesenho visual.
2. **Enquanto backup corre em paralelo**: auditar diffs e dependências da Home, da API Stage09 e da Web Stage09; preparar matriz de conflitos e plano de integração; manter tudo apenas em QA/branches isoladas. Reexecutar gates de cada SHA que tiver código alterado; testes anteriores não substituem novos.
3. **Gate externo do backup**: obter evidência verificável de backup real criptografado, cópia independente, chave guardada e restauração real em PostgreSQL 17 isolado. Kit e CI com dados sintéticos não equivalem ao gate.
4. **Gate Render**: após aprovação específica, operação controlada para remover comandos de banco do build; comprovar settings salvos, logs, SHA LIVE, `/health`, ausência de mutações e de regressão, com rollback de aplicação planejado. Não confundir rollback de aplicação com recuperação de banco.
5. **API read-only da Etapa 09**: revisar #663 contra main atual, preservar #668 e conciliar rotas, autenticação/workspaces, snapshots, limites, `no-store`, respostas e revisão de leitura; exigir novos testes HTTP/JWT/PostgreSQL com dados fictícios e autorização de publicação isolada. Não anexar indiscriminadamente o frontend #656.
6. **Integração Home/Web Lançamentos**: compor a linha #664/#668/#669 com #656 sobre baseline controlado, nunca substituir a Home validada por sua base antiga. Validar navegação, sessão, alerta/vencimentos, DataGrid e filtros de Lançamentos, indicadores canônicos, preferências locais, zero overflow, responsividade, acessibilidade, regressão financeira e E2E com backend de QA autenticado.
7. **Gate humano e release**: somente após testes e avaliação de publicação real, obter autorizações expressas por merge/deploy. Separar aprovação visual existente da homologação operacional.
8. **Etapa 10**: iniciar Novo/Editar Lançamento em chat próprio somente após encerramento formal da Etapa 09. Preservar writer de benefício, proteção de saldo, autocomplete, parcelamento, Fixo e idempotência.

## 6. Critérios de saída e pendências reais

- **Concluído nesta análise:** inventário de dependências, identificação de arquivos sobrepostos, gates técnicos recentes e bloqueio LIVE do Render. Apenas documentação.
- **Pendente:** integração técnica em branch isolada, comparação detalhada de patches/conflitos, backup real em fluxo paralelo, operação segura Render, publicação API autorizada, homologação operacional Home/Lançamentos e fechamento formal das PRs.
- **Divergência de planejamento:** não há uma sequência de merge segura derivada apenas da cadeia atual, porque o frontend Stage09 e a Home P0 bifurcaram de bases diferentes, enquanto duas linhas da API compartilham `routes.ts`.
- **NO-GO** enquanto houver Build Command destrutivo, backup real sem restauração comprovada, conflitos ainda não reconciliados, teste vermelho ou aprovação ausente.
- Android congelado. Nenhum schema/writer/cálculo financeiro alterado para acomodar layout. Não iniciar Pendentes/Etapa 10 neste chat.

## 7. Referências

- Autoridade: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.
- Handoff Stage09: `docs/MEG-WEB-STAGE09-PT4-OPERATIONAL-HANDOFF-20261109.md` (#656).
- Preflight Build: `docs/MEG-STAGE09-RENDER-PREFLIGHT-20261111.md` (#670).
- Backup: PR #666, conduzida separadamente.
- Auditoria transversal futura: issue #671; preferências sincronizadas futuras: issue #662.
