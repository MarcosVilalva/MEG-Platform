# MEG Finanças Web Evolution | Painel auditável do saneamento financeiro

Data-base: 17/11/2026. Escopo: **somente saneamento estrutural e histórico dentro da Etapa 10**. O percentual abaixo NÃO representa o andamento de todas as telas da Web, do Android ou do MEG inteiro.

## Método do indicador

**10 marcos verificáveis, 10 pontos cada, contagem binária: 10 pontos somente com resultado comprovado.**
Proposta, implementação isolada sem teste ou CI que passou em componentes diferentes não contam como conclusão do marco correspondente. Reavaliar o indicador após cada gate, com documento/commit, workflow e evidência.

**Progresso da regularização: 40% (4/10 marcos).**
**Migração/saneamento executado em produção: 0% (nenhum `UPDATE`/migração real aprovado ou realizado).**
**Fase em andamento: marco 5 de 10, compatibilidade do cliente legado/Android congelado.**

| Marco | Critério de aceite para receber 10% | Status e evidência |
| --- | --- | --- |
| 1. Inventário financeiro | Volume, IDs e divergências de dados ativos/arquivados caracterizados, sem escrita | **CONCLUÍDO**. 6.576 eventos, 3.731 ativos, 2.845 arquivados, 3.626 categoria e 3.512 pagamento nulos entre os ativos; relatório de auditoria 17/11 |
| 2. Causa do problema | Destruição de identidade reproduzida em SQL/PG17 sem dados reais | **CONCLUÍDO**. Issue #698 e [Actions #44068500928](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44068500928) |
| 3. Proteção no código | `synchronizeNormalizedRows` sem apagar/recriar a identidade, FKs preservadas, conflitos bloqueados | **CONCLUÍDO EM QA**. PR #697 Draft, sem deploy; alteração em `normalization-migration.ts` e `routes.ts` |
| 4. Regressão técnica isolada | PostgreSQL 17, contrato HTTP, rollback/idempotência, proteção de relações, TypeScript e regressões financeiras verdes | **CONCLUÍDO EM QA**. [Actions #44075672369](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44075672369), SUCCESS |
| 5. Compatibilidade cliente legado | Retentativas, 409, outbox, exclusão/reinclusão, offline e Android congelado sem regressão ou perda | **EM ANDAMENTO, BLOQUEADO**. [Issue #699](https://github.com/MarcosVilalva/MEG-Platform/issues/699): cliente tenta de novo em qualquer 409; restauração implícita bloqueada pela nova API. Teste de caracterização [Actions #44078471887](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44078471887), SUCCESS. Teste verde não resolve a incompatibilidade |
| 6. Segurança de sessão integrada | JWT real e fluxos autorizados em QA isolado, sem escrita produtiva | **PENDENTE**. Fastify.inject anterior usou autenticação simulada |
| 7. Mapeamento de categorias e prevenção | Revisão e aceite financeiro dos 3.033 candidatos; tratamento explícito dos 591 restantes; impedir recorrência na importação/edição | **PENDENTE**. Nomes não bastam para atribuir FK |
| 8. Mapeamento de pagamentos e benefícios | Revisão e aceite dos 2.900 candidatos e 612 exceções, modalidade credit/other, Verocard/benefício, receitas e cartões | **PENDENTE**. Regras/status precisam ser preservados |
| 9. Recuperação e ensaio migratório | Backup/restauração verificáveis em ambiente autorizado, plano por IDs, dry-run com comparativos e rollback; arquivados avaliados | **PENDENTE**. Não reutilizar sandbox da Etapa 09 |
| 10. Regularização real e homologação | Autorização específica, migração transacional, reconciliação de 100% das invariantes aplicáveis e homologação funcional/visual explícita | **PENDENTE**. Produção continua intacta |

**Fórmula:** `(marcos comprovados e aceitos / 10) * 100`. Não apresentar avanço estimado como resultado técnico.

## Leitura do risco e interpretação

- O código corrigido está em branch QA, **não implantado**; em produção ainda existe o writer anterior.
- O cliente em `apps/web/src/instant-persistence.js`, usado no contexto WebView/legado, trata todo HTTP `409` em `ensureOutboxConfirmed` como retentativa; `scheduleOutboxRetry` mantém o outbox pendente. O cliente também aceita delete e reinserção da mesma ID via `legacy-state-patch.js` / `cloud-write-ahead-core.js`.
- O servidor protegido rejeita `NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE` e vínculos canônicos em mutações incompatíveis. Alterar apenas o código HTTP não demonstra que o cliente congelado continuará funcional; mudar 409 para 422 isoladamente também não elimina os retries em falhas.
- Os cenários de compatibilidade foram **caracterizados**, não homologados em Android real. A correção P0 de identidade (issue #698) não deve ser encerrada até resolver a compatibilidade da issue #699.
- Percentual não substitui os gates de segurança, a aprovação visual ou autorização de merge/deploy.

## Próxima ação técnica

Resolver `#699` em desenho que preserve o cliente Android congelado, sem reintroduzir exclusão destrutiva; testar contra os contratos existentes do outbox e os fluxos `PATCH/PUT` em PostgreSQL 17 descartável. Só então o marco 5 recebe 10 pontos. Não avançar à Etapa 11.
