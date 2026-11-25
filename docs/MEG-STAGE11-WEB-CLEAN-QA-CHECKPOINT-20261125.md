# MEG Stage11 | Checkpoint de QA da candidata Web limpa

**Data:** 25/11/2026
**Repositório:** `MarcosVilalva/MEG-Platform`
**Branch:** `stage11/web-foundation-clean-20261125`
**Parent exclusivo:** `main@28703a95310c9b9b5f193ef4f3a0cbe80e121f07`
**Escopo:** Fase A da Issue #699 e RLS da Issue #707, somente QA e código isolado.

## 1. Reconstrução de origem comprovada

- PR #706: `ca7560243856bbfee72384ea739847be1fb090f1`. Somente trechos funcionais para criar evento, verificar saldo, registrar suspeitas, leitura, revisão e desfazimento.
- PR #708: `3612bb5c7ba9d691e2c842574214a3e2f5ec08f4`. SQL de hardening idêntico ao da #706, blob `12d16bc4c7b6991add4f4e38c8263953952824a4`.
- Fixture de recibos A14: PR #706, blob `1fb28a7adbe6e25161c1ff0d1cc4c67e349dedeb`, arquivo `packages/database/prisma/stage10-issue699-receipt-purge-guard.disposable.sql`, **somente QA descartável**.
- Proveniência arquivo a arquivo: `docs/MEG-STAGE11-WEB-CLEAN-ISSUE699-PROVENANCE.md`.
- Reconstrução reprodutível: `scripts/meg-stage11-port-curated.mjs`. Nenhum commit ancestral das PRs #696/#697/#705 foi mesclado ou cherry-picked.
- Sem mudanças de UI ou código Android. Endpoint A17 permanece **OFF por padrão**; o valor `1` foi usado exclusivamente dentro do processo de teste com PostgreSQL local fictício.

## 2. Gates efetivamente executados na nova árvore

| Gate / validação | Resultado | Evidência |
|---|---|---|
| `npm ci --ignore-scripts --prefer-offline` | PASS | NITROMEG, clone novo |
| Prisma Client Generate (6.12.0) | PASS | `npm run db:generate` |
| API TypeScript build | PASS | `npm run build:api` |
| Web Vite build | PASS | `npm run build:web`; aviso não bloqueante de chunk >500 KB |
| Fundação Web | PASS | `npm run test:evolution-foundation` |
| Fonte única da Web | PASS | `npm run test:evolution-data` |
| Contratos RLS estáticos | PASS | `npm run test:supabase-rls` |
| Segurança | PASS | `npm run test:security` |
| A01–A14 e A18 | PASS | Teste **original, inalterado** `stage10-issue699-phase-a-http-pg17.disposable.test.ts`, Fastify/JWT/PG17 |
| Instalação SQL RLS PostgreSQL 17 descartável | PASS | PostgreSQL 17.12, SQL da PR #708 |
| A17 | PASS | Teste **original, inalterado** `stage10-issue699-a17-review.pg17.disposable.test.ts`, Fastify/JWT/PG17 |
| Remoção do cluster QA PG17 | PASS | `STAGE11_QA_CLUSTER_CLEANUP=COMPLETE` |
| `npm run test:finance` integral | **FAIL** | `first-write.contract.test.ts:35` exige correspondência textual exata de `const workspace = await resolveWorkspaceContext(userId)`; a versão segura usa opções para evitar bootstrap legado |
| A15 e A16 | **NÃO EXECUTADOS** | Gates originais envolvem APKs; integração Android permanece fora do escopo atual |

Os testes originais **não foram alterados nem enfraquecidos**.

## 3. Primeiro teste do A14 e correção do ambiente

A primeira tentativa do gate A14 falhou com `P2025` porque o PostgreSQL novo ainda não possuía a fixture de tombstone que o workflow original da PR #706 instala antes do teste. A correção foi adicionar **a mesma fixture SQL original, sem modificá-la**, somente no PostgreSQL descartável. Na segunda rodada, **A01–A14 e A18 passaram integralmente**, sem alterar asserções nem lógica dos testes. Não presumir que a proteção de expurgo de recibos esteja instalada em produção.

## 4. Ambiente e limpeza

- Clone WSL isolado: `/home/m_vil/meg-stage11-web-clean-20261125`.
- Bancos temporários locais: `meg_stage10_phase_a_sandbox` e `meg_stage10_a17_sandbox`; PostgreSQL 17.12, bind `127.0.0.1:5432`; somente identidades e dados fictícios.
- Logs locais: `.qa/logs/`. Runner local: `.qa/run-stage11-disposable.sh`, **não versionado**.
- Cluster PG17 criado apenas para o QA, encerrado e removido após os gates. Nenhum Supabase, Render, banco protegido ou produção acessado.

## 5. Bloqueios e restrições

1. **Gate financeiro completo ainda vermelho** por contrato de escrita legado. Não adaptar teste apenas para obter verde. O contrato deve ser avaliado como comportamento e compatibilidade antes de revisão autorizada.
2. **A15/A16 não repetidos.** A matriz anterior 18/18 **não é transferida**. O conjunto realizado nesta candidata é A01–A14, A17 e A18, ficando A15/A16 pendentes pela proibição atual de integração Android.
3. **CI remota da candidata não demonstrada** por testes locais. Não confundir Web build com homologação funcional e visual no navegador real.
4. **Schema `CardLimitControl`** foi trazido para combinar com RLS, sem migração protegida. Qualquer rollout exige plano próprio.
5. A17 continua desabilitado por padrão. Nenhum deploy, merge, habilitação em ambiente persistente ou aplicação do SQL real.
6. PRs #705/#706/#708 permanecem Draft; Issues #699/#707 permanecem abertas. Android permanece congelado.

## 6. Próxima ação segura

Revisar o contrato financeiro legado que está falhando sem afrouxá-lo, preparar gate CI específico da nova branch e demonstrar compatibilidade Web no navegador real com infraestrutura descartável. Somente após aprovação técnica/funcional/visual explícita decidir substituição das PRs antigas, merge e implantação.

## 7. Regra permanente de saúde do chat

Se houver risco de perda de decisões, outputs extensos ou precisão, emitir aviso preventivo no topo da resposta e checkpoint integral com SHAs, PRs, Issues, gates, restrições e prompt de retomada pronto para copiar, sem esperar solicitação. Repetir periodicamente até transição.
