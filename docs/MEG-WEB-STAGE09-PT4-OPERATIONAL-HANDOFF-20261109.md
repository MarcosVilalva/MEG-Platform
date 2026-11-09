# MEG Web Evolution | Etapa 09 PT4 | Handoff técnico-operacional
**Data de verificação:** 09/11/2026 (horário de Brasília)
**Escopo:** fechamento de pendências técnicas de Lançamentos e preparação documental da Etapa 10; **Etapa 10 não autorizada**.
**Base consultada:** branch `preview/09-lancamentos-20261104`, `MEG-WEB-CONTINUIDADE-OFICIAL.md`, `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, `docs/MEG-WEB-STAGE10-FINANCIAL-READINESS-AUDIT-20261109.md`, PRs, issues e Render em leitura.

## 1. Estado observado, sem presunções
- **PR #656**: OPEN / DRAFT / NÃO MERGED / mergeable na consulta, HEAD `c5258dd0d90868e18797a5e66abc1e62732e50bb`. Workflow da Etapa 09 [#42680820202](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42680820202) SUCCESS: jobs `lancamentos` e `Snapshot transacional no PostgreSQL descartável (3.731 registros)` SUCCESS.
- **PR #663**: OPEN / DRAFT / NÃO MERGED / mergeable, HEAD `fe50d3e11e5f2f364fb4b786e95442618082fac7`, base `main`. Workflow API read-only [#42657015109](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42657015109) SUCCESS: `api-readonly-contracts` e `postgres-ephemeral-snapshot` SUCCESS. `MEG Platform CI` e CORS pontual também SUCCESS; `MEG Web Evolution Foundation` SKIPPED neste commit, não tratar como FAIL nem como execução aprovada.
- **Issues #660, #661, #662**: OPEN. A issue #660 contém checkboxes históricos de homologação desatualizados em relação ao **checkpoint posterior** que registra aprovação explícita dos cinco pontos visuais pelo usuário em 09/11. A aprovação é restrita à interface exibida. #661 (Home) e #662 (personalização transversal) não pertencem a este chat.
- **Render Web** `meg-lancamentos-09-pr`, serviço `srv-dblou80m7kps73brj0kg`: deploy `dep-dbp1l9j538fc73egrc20` LIVE no mesmo SHA `c5258dd0d908...`; URL sem cache `https://meg-lancamentos-09-pr.onrender.com/web-evolution.html?tela=lancamentos&v=c5258dd0d90868e18797a5e66abc1e62732e50bb`.
- **Render API** `meg-platform-api`, serviço `srv-d98k61daeets7384hvb0`, branch `main`: último deploy LIVE `dep-dbm92b17lnhs738s0jr0`, SHA `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`, de 05/11. **Sem snapshot/summary filtrado da PR #663 publicado.** Preservar fallback com duas passagens e `—` nos KPIs quando não houver resposta canônica consistente.

## 2. Bloqueio de produção comprovado
O build REAL configurado no serviço Render API é:
```sh
npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production
```
`packages/database/prisma/prepare-production.ts` pode executar `DELETE FROM "Budget"` para deduplicar. `packages/database/package.json` define `db:push:production` como `prisma db push --accept-data-loss && tsx prisma/ensure-performance-indexes.ts`. **NÃO fazer deploy/redeploy nem merge que acione esse pipeline.** O fato de este comando ter sido executado em deploys passados não o torna seguro para o próximo.

**Correção operacional proposta, NÃO aplicada:** no serviço exato `meg-platform-api`, retirar os dois scripts de mutação do comando de build; candidato revisado:
```sh
npm ci --audit=false && npm run db:generate && npm run build:api
```
A conexão Render disponível nesta sessão permite leitura, logs e deploy, mas não oferece atualização da configuração `buildCommand` do web service. **O bloqueio não foi resolvido na infraestrutura**; requer operador autorizado no painel Render ou ferramenta própria que edite essa configuração. Há auto-deploy ligado à branch `main`: planejar a mudança para que salvar configuração **não cause publicação não aprovada**. Não se deve contornar o problema mudando scripts financeiros de produção no repositório ou acionando `trigger_deploy`.

Após alterar, **reler** buildCommand pelo serviço Render, executar o preflight da PR #663 com a string REAL, documentar resultado e só então submeter plano de release para aprovação explícita. O preflight do CI com o comando CANDIDATO não prova alteração do Render.

## 3. Gates de publicação que ainda faltam
1. Verificar revisão independente do diff da PR #663 contra a `main` mais recente; limitar ao GET autenticado, política de read-only e testes, sem writers, schema, Android ou Home.
2. Confirmar Render build não destrutivo **antes** de qualquer merge ou deploy; conferir `/health`, CORS, `no-store`, autenticação 401/200, isolamento de usuário, compatibilidade de schema/índices por consulta somente leitura.
3. Aprovar expressamente a integração **isolada** de #663; não incluir #656 no merge. Confirmar SHA do deploy LIVE, logs sem vazamento de dados e rollback de código sem migração de banco.
4. Medir no caminho autenticado real: snapshot, 3.731 eventos ativos observados na auditoria anterior, limites 5.000/5.001, IDs/ordem, rótulos legados, contagens e latência. Os 306 ms/5,19 MB documentados são do PostgreSQL descartável, não de produção.
5. Testar critérios de filtros gerais e avançados, token/revisão, casos de concorrência, filtro histórico sem IDs, consistência dos quatro KPIs e fallback em caso de incompatibilidade. **Não somar valores financeiros no browser.**
6. Homologar operacionalmente leitura no MEG e ausência de regressão na Home/Android; só depois avaliar o fechamento da Etapa 09. Cinco pontos visuais já foram aceitos, sem necessidade de refazê-los.

## 4. Matriz de preparação para Novo/Editar e edição em massa (NÃO implementar agora)
**Já caracterizado em código/testes da Etapa 09:** competência por fechamento/vencimento; fim de semana e fevereiro comum/bissexto; travessia dezembro/janeiro; preservação e bloqueio de parcelas pagas/parciais; uma parcela aberta sem recriação das demais; convivência `CardPurchase/CardInstallment` versus eventos históricos; deduplicação por `purchaseId`; estorno/saldo credor/status Fixo e crédito; segregação benefício; limite de 200 eventos do lote genérico e seu domínio. CI `#42680820202` SUCCESS.

**Ainda exigir integração/teste antes de liberar funções na Etapa 10:**
- Novo monetário: saldo e status, idempotência, centavos, origem, categoria/conta/método e validação de erro com autenticação e banco efêmero.
- Autocomplete canônico: recuperar categoria/conta/método sem copiar valor/data, incluindo histórico sem IDs.
- Alimentação Verocard: writer próprio, `Conta Benefício + Verocard + Pago`, recarga/consumo, saldo insuficiente, isolamento de saldo monetário.
- Pendentes/baixa, transferências e pagamento parcial: atomicidade, saldo disponível, confirmação e concorrência.
- Edição de `FinancialEvent` em lote: máximo 200 IDs, permissionamento, versões, rollback integral em erro, vinculações bloqueadas, recalcular ledger sob o writer canônico, atualização das leituras.
- Mover **múltiplas compras formais** para outro cartão ou alterar **várias parcelas** não dispõe de writer atômico evidenciado; NÃO simular com vários PATCHs. Exige contrato específico, revisão de faturas/limites e testes.
- `dueDay/closingDay`: investigar efeitos históricos; não habilitar mudança retroativa sem contrato de preservação e testes.
- Seleção mista de `FinancialEvent` e `CardPurchase`: prévia por domínio e bloqueio/confirmacão por contrato; sem PATCH genérico.
- Estados pago, aberto, parcialmente pago, cancelado, créditos e pagamento já vinculado; 409 por concorrência e recarga, sem sobrescrever silenciosamente.
- Resumos e UI obrigatoriamente obtidos da autoridade financeira, nunca calculados por componente.

**Diretriz de produto confirmada:** a seleção múltipla já existe, mas `Editar selecionados` NÃO foi implementado. A futura interface poderá permitir cartão, vencimento e parcelas apenas após identificar o domínio de cada item e comprovar a operação segura. **Não implementar na Etapa 09 PT4 sem autorização específica.**

## 5. Preservação e próximo gate
- **Arquivos financeiros modificados nesta revisão:** nenhum.
- **Schema, writers, dados financeiros, Android, Home, UI visual:** nenhum alterado por este handoff.
- **Merge/deploy API:** nenhum executado.
- **Decisão:** Etapa 09 permanece ABERTA, PR #656 e PR #663 DRAFT. O próximo bloqueio prioritário é a alteração auditável do buildCommand real do Render **sem disparar deploy**, seguida da revisão operacional da PR #663 e autorização expressa para release. Só depois considerar transição para Etapa 10.
