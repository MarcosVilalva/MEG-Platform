# MEG Etapa 09 | Candidata isolada de leitura do GET /app-state com assinatura integral

**Estado:** experimento Draft de redução de Shared Pooler Egress. **Base:** PR #689, exclusivamente experimental, sem merge ou deploy. **Issue:** [#690](https://github.com/MarcosVilalva/MEG-Platform/issues/690). **Autoridade:** `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, checkpoint oficial PR #666.

## 1. O problema confirmado

Inspeção read-only em 14/11/2026:
- `pg_stat_statements`, acumulado desde 10/07/2026: a consulta ampla de `FinancialEvent` com `sourcePayload`, usada em `normalization-migration.ts`, teve **6.820 chamadas e 24.753.440 linhas**. A consulta pode ser compartilhada por GET, auditoria e outras rotinas, portanto não representa contagem exclusiva do GET nem mede bytes de rede faturados.
- Em PostgreSQL 17 sintético com 3.630 eventos, `normalizedStateForRead` retornou **6.740.517 e 6.740.297 bytes de protocolo** em duas chamadas idênticas. Ambas tinham mesmo estado, revisão, integridade financeira e fingerprint.

## 2. Proposta

A nova função `cachedNormalizedStateForRead` em `apps/api/src/modules/app-state/normalization-read-cache.ts` pode ser usada SOMENTE pelo `GET /app-state` autenticado, **quando a variável de ambiente `MEG_STAGE09_GET_APPSTATE_CACHE` tiver valor exato `enabled`**. Sem essa variável ou com qualquer outro valor, a rota usa a leitura original `normalizedStateForRead`. Nenhum writer, transformação de saldo, esquema do banco, outro endpoint ou frontend foi modificado.

Na execução habilitada:
1. A rota chama `resolveWorkspaceContext` e verifica o contexto do usuário em **todo GET**, como antes. O cache usa chave de workspace + proprietário, não é um cache global cross-workspace.
2. Uma única instrução SQL somente leitura calcula SHA-256 sobre TODAS as colunas de `AppState` e TODAS as linhas de `FinancialEvent`, inclusive arquivadas, com ordem estável. Retorna hash pequeno e não valores ou textos financeiros.
3. Somente um resultado anterior com `normalizedPrimary=true` e `integrity.reconciled=true` pode ser reutilizado se a assinatura inteira corresponder. Erro SQL, primeiro acesso, alteração, modo rollback ou divergência passam pelo read-model **original**.
4. O primeiro miss faz leitura financeira completa e exige hash igual **antes e depois** para gravar cache. Se houver escrita intercalada, a resposta segue o caminho integral e não será guardada.
5. Mantém no máximo UM workspace em memória e não armazena resposta superior a **10 MiB**. Em volumes maiores volta à leitura original, sem limitar o tamanho da resposta HTTP.
6. Em cache hit a observabilidade de `recordNormalizationRuntimeStatus` é atualizada sem mudar os dados financeiros.

A interface HTTP e a ordenação dos lançamentos devem ser exatamente iguais. Não se emprega simples TTL ou só revisão, pois isso deixaria passar mudanças externas no banco.

## 3. Caracterização PostgreSQL 17 descartável

No SHA inicial da candidata, [PG17 #43585471550](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585471550), **SUCCESS**:

- Primeira leitura guardada: **6.740.633 bytes** do PostgreSQL para Node.
- Segunda leitura sem alteração: **168 bytes**, redução **99,998% nessa repetição específica**.
- Resposta completa do GET guardado idêntica à leitura antiga, incluindo estado, revisão, integridade e timestamps.
- Alteração externa direta em `signedAmount` levou à divergência e ao fallback. Modificação não financeira de `AppState` invalidou cache. Rollback forçou leitura legada. Arquivamento externo foi detectado e não criou lançamento.
- Os testes anteriores de ledger, concorrência, rollback transacional, exclusão de órfãos, sourcePayload, status e fingerprint permaneceram preservados.

Depois acrescentamos testes de **alteração direta de sourcePayload** e contrato da variável de ambiente: ausência/valor `true` desativam a otimização; somente `enabled` ativa. A suíte final deve ser verificada no HEAD após documentação, não presumir sucesso por uma rodada anterior.

## 4. Segurança operacional

**Limitações:**
- Hash de todas as linhas consome CPU/IO no PostgreSQL. A redução de bytes por GET não significa economia de CPU, RSS ou Egress faturado. Falta medir o hit rate e a taxa de reinicializações reais.
- Uma atualização no banco após o snapshot do SQL pode ocorrer entre a checagem e o envio da resposta, como na leitura original. A assinatura dupla no miss impede o cache de uma reconstrução com alterações intercaladas detectadas, mas não representa bloqueio de escrita ou serialização linearizável de respostas.
- Apenas repetição sem mudança obtém a redução de 99,998% por consulta. Primeira leitura e alterações exigem a auditoria financeira completa. A taxa real de GET do MEG e o mix de requests não foram contabilizados por endpoint.
- Não libera merge/deploy: [#691](https://github.com/MarcosVilalva/MEG-Platform/issues/691) exige remover DDL/DML do Build Command. Backup e recursos gerenciados Supabase mantêm Gates 1 PARCIAL e 2–4 NO-GO.

**Critérios de rollout futuro**: backup íntegro e restaurável, Build Command seguro, isolamento de QA, acesso/identidade testados em múltiplos workspaces, testes de integrações financeiras, observabilidade de acertos/misses e capacidade PG, autorização separada para alteração de ambiente e deploy. Com flag ausente o comportamento produtivo permanece original.

## 5. Arquivos

- Criado `apps/api/src/modules/app-state/normalization-read-cache.ts`.
- Alterado `apps/api/src/modules/app-state/routes.ts`: apenas seleção condicional da leitura no GET autenticado, opt-in e sem mudança de resposta.
- Ampliado `apps/api/src/modules/app-state/stage09-egress-pg17-e2e.test.ts`: protocolo PG17, igualdade completa, alteração externa, rollback, arquivamento, sourcePayload e feature flag.
- CI da branch de QA `fix/stage09-appstate-read-qa-20261114`: workflow PG17 descartável, Platform CI.
- Nenhuma configuração, segredo, rota HTTP, tabela, dado real ou aplicação Android/Web de produção foi alterada.
