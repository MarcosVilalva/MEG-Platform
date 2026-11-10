# MEG Web Evolution | Etapa 09 — redução protegida de Egress (10/11/2026)

**Status:** IMPLEMENTAÇÃO CANDIDATA em branch isolada; CI e integração ainda precisam ser confirmados; **NÃO FAZER MERGE/DEPLOY** antes dos gates operacionais.

## 1. Contexto e causa provável
- Supabase Free do projeto `meg-financas` atingiu **11,365 GB de Egress** no ciclo atual (5 GB incluídos na organização; 11,419 GB total da organização); ciclo anterior 34,338 GB no Usage Summary. Série diária do Work mostra **Shared Pooler 100% dos pontos discriminados**, mas sumário não reconcilia integralmente com total diário, sem atribuição por request/SQL.
- `pg_stat_statements` (desde reset **10/07/2026**) mapeou `normalization-migration.ts:normalizedItems` a **6.591 execuções / 23.922.170 linhas**, com ~3.630 eventos legados por consulta; `AppState.state` atual mede ~2,41 MB de JSON.
- Auditoria da API faz full scan **15/15 minutos**, Web consulta `/app-state` e `/app-state/normalization-preview` com sobreposição. Padrão diário persiste em fins de semana, portanto não é justificável culpar exclusivamente as validações visuais.
- Rastreio original, com todas as ressalvas: [`docs/MEG-STAGE09-EGRESS-TRACE-20261110.md`](https://github.com/MarcosVilalva/MEG-Platform/blob/stage09/pt4-auditoria-sem-deploy-20261109/docs/MEG-STAGE09-EGRESS-TRACE-20261110.md).

## 2. Alterações desta branch (sem alteração de regras financeiras)
### A. Redução segura dos full scans periódicos
- Novo `apps/api/src/modules/app-state/normalization-audit-gate.ts`: marcador **somente leitura** por workspace, revisão/atualização do AppState, número e última atualização dos eventos legados ativos **e contadores globais de INSERT/UPDATE/DELETE nas tabelas AppState e FinancialEvent** (visão PostgreSQL `pg_stat_user_tables`).
- `apps/api/src/server.ts`: preserva **pulso a cada 15 minutos**, mas transfere todas as linhas para a verificação original `normalizationPreview()` somente:
  1. na primeira rodada;
  2. quando há alteração observável no marcador;
  3. quando passaram **2 horas** desde a última verificação profunda (mesmo sem alterações);
  4. a cada pulso enquanto houver divergência/erro.
- Toda verificação profunda segue usando **o fingerprint de SHA-256 original**, classificação e regras canônicas sem alterar lógica de saldo, parcelas, status, benefícios, cartões ou lançamentos. SQL `aggregate` do marcador é somente leitura, executado dentro do servidor conectado ao banco.
- Marcador conferido **antes e depois** do full scan; alterações concorrentes impedem o registro de verificação concluída. Erros/fallback exigem nova comparação. Se a visão estatística estiver indisponível ou incompleta, a API executa o fingerprint integral a **cada 15 minutos** (comportamento anterior), sem depender do marcador para validar a integridade. O modo rollback continua protegido. Contadores de mutação de tabela detectam também writes SQL fora do Prisma, mesmo sem mudanças em `updatedAt`.
- **Tradeoff transparente:** alterações diretas via SQL tendem a ser detectadas em até 15 minutos também pelos contadores de mutações em `pg_stat_user_tables`; porém essas estatísticas são assíncronas e **não representam prova criptográfica de invariância**. Um drift invisível aos marcadores ainda pode aguardar até **2 horas** para o fingerprint profundo (antes tentado a cada 15 minutos). Esse intervalo não muda nenhum cálculo financeiro, mas é uma mudança no prazo de detecção de falhas. **Requer aceite técnico específico antes de produção** e teste de detecção de divergência fora dos writers.

### B. Eliminação de leitura duplicada de integridade na Phoenix **somente para Web**
- `apps/web/src/phoenix/data/normalization-from-shared-state.ts`: reutiliza `integrity.reconciled: true`, `count` e `revision` devolvidos pelo **mesmo GET `/app-state`**, que já realizou comparação de fingerprint do lado da API.
- `apps/web/src/phoenix/data/load-phoenix-read-model.ts`: deixa de solicitar em paralelo `GET /app-state/normalization-preview` quando a resposta do `GET /app-state` já atesta normalização primária íntegra. Caso a resposta seja legada, ausente, inconsistente, incompleta ou em fallback, mantém a **verificação completa** anterior; o botão de comparação/reparo em Configurações segue usando a rota canônica precisa.
- `VITE_MOBILE_APP === 'true'`: Android mantém a requisição em paralelo original sem alterações comportamentais. Nenhuma alteração no build nativo, plugins ou arquivos Android.
- Nenhuma página calcula saldo/status no frontend, nenhum endpoint writer alterado.

## 3. Testes de caracterização adicionados
- `normalization-audit-gate.test.ts`: primeiro ciclo, marcador inalterado, revisão alterada, timestamp atualizado, contagem aumentando/diminuindo, incremento de contador de INSERT/UPDATE/DELETE, estatísticas ausentes, mudança de workspace, clock rollback e auditoria profunda mandatória após 2h.
- `normalization-from-shared-state.test.ts`: confirma reaproveitamento apenas quando há prova de paridade, e exigência de full diagnostic diante de fallback, divergência e payload incompleto.
- Ambos ligados a `npm --workspace apps/api run test:app-state`. CI e `npm run build:api` / `npm run build:web` **devem passar para candidato tecnicamente validado**. Não declarar validado só porque há testes.

## 4. Gates obrigatórios antes de merge/deploy
- [ ] Revisar e passar `test:app-state`, `test:finance`, contratos Etapa 09, e builds Web/API no SHA final.
- [ ] Medir diferença em **ambiente isolado**, com mocks representativos de 3.630 eventos + AppState volumoso, sem tocar base financeira. Demonstrar paridade de fingerprints, totais, event counts e comportamento com atualizações concorrentes.
- [ ] Verificar com testes que alterações diretas SQL acionam os contadores de `pg_stat_user_tables` e a checagem profunda; decidir se **2 horas** como fallback de drift invisível é aceitável frente à segurança financeira.
- [ ] Manter preview isolado, sem reutilizar screenshots obsoletos. Android e Home PT2 preservados.
- [ ] Confirmar **backup externo criptografado + restauração isolada realmente testada**, inclusive Auth/objetos relevantes, antes de qualquer deploy.
- [ ] Corrigir Render `meg-platform-api` Build Command **sem executar scripts `db:prepare:production` nem `db:push:production --accept-data-loss`**; salvar configuração pode gerar deploy e precisa de planejamento/autorização específica.
- [ ] Resolver o status de cotas/restrição Supabase, avaliar custos apenas com evidência; recuperação do ciclo por volta de 27/11 não garante restabelecimento imediato.
- [ ] Aprovação técnica de publicação e validação operacional explícita depois de preview. Nunca associar CI verde a homologação visual.
- [ ] Não mesclar PR #656 ou PR #663 automaticamente; elas têm fluxos próprios.

## 5. Estado da entrega
Branch `stage09/egress-performance-protected-20261110`. Alterações restritas à API da auditoria e carregador Phoenix Web, dois testes de caracterização, script de testes e documentação. **Não há configuração de Render, banco, serviço, conta, plano ou UI oficial modificada.**

Este documento é uma proposta operacional testável e auditável. O Egress exato economizado ainda não foi medido; não prometer resultado numérico sem telemetria.
