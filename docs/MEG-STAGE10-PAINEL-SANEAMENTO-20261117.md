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
| 5. Compatibilidade cliente legado | Retentativas, 409, outbox, exclusão/reinclusão, offline e Android congelado sem regressão ou perda | **EM ANDAMENTO, BLOQUEADO**. [Issue #699](https://github.com/MarcosVilalva/MEG-Platform/issues/699): cliente congelado tenta novamente em todo 409. O payload aditivo `retryable` da API e o módulo Web-only passaram em [Actions #44082221551](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44082221551), mas **não** estão integrados ao Android ou writer real; o 409 legado ainda fica em loop. Decisão: `docs/MEG-STAGE10-COMPATIBILIDADE-OUTBOX-20261117.md` |
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

## Atualização do marco 5: protocolo seguro em QA, compatibilidade ainda não resolvida
Em 17/11/2026 a branch de QA adicionou `normalization-conflict-policy.ts` à API e `stage10-write-conflict-policy.ts` **somente** ao espaço da nova Web, sem alterar Android. O protocolo classifica erros permanentes como `retryable:false` e evita considerar 2xx prova suficiente sem recibo. Em teste, a decisão de nova Web esgota até três releituras de revisão antes de proteger a operação pendente sem novos replays automáticos. [CI #44082221551](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44082221551) **SUCCESS**. A função da nova Web é ainda **não conectada a um writer ativo**.

A incompatibilidade da APK congelada permanece. A origem padrão do aplicativo e o Render apontam para a API compartilhada; `render.yaml` contém **auto deploy** e `db:push:production` no build. Merge/deploy poderia atingir Android e schema real sem aprovação. Logo, **marco 5 ainda NÃO concluído, indicador 40%, migração produtiva 0%**. Ver `docs/MEG-STAGE10-COMPATIBILIDADE-OUTBOX-20261117.md` e issue #699.


## 17/11/2026 | Compatibilidade: testes de protocolo e segregação aprovados, marco 5 ainda aberto
- [Actions #44088509491](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44088509491) **SUCCESS**: função `ensureOutboxConfirmed` extraída literalmente do JS legado repete qualquer 409 e não lê `retryable:false`; outbox permanece protegido.
- [Actions #44088879141](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44088879141) **SUCCESS**: prova que a simples substituição por HTTP 422 não encerra o agendamento de retry; CI verifica que os arquivos centrais Android/legado cobertos não sofreram modificações desde o baseline do PR #696.
- [Actions #44089175372](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44089175372) **SUCCESS**: dois schemas e papéis PostgreSQL 17 temporários, bloqueando leitura/escrita cruzadas e revertendo tudo.
- [Actions #44089989091](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44089989091) **SUCCESS**: duas execuções sequenciais reais de Fastify e Prisma, com credenciais/esquemas próprios, PATCH e GET de dados fictícios, preservação de IDs e acesso SQL cruzado recusado; cleanup dos esquemas/roles. Autenticação de teste simulada.
- Plano técnico e limitações: `docs/MEG-STAGE10-ISOLAMENTO-COORTES-GATE-20261117.md`.

**Contagem segue 4/10 = 40% técnico, migração real 0%.** O marco 5 exige evidência com Android instalado e decisão segura de coexistência/reconciliação, não apenas isolamento de QA. Não há merge/deploy, produção, Android, custos ou migração. A Issue #699 P0 permanece aberta.


## 17/11/2026 | Gate HTTP concorrente de duas coortes
- [Actions #44092660163](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44092660163) **SUCCESS, 27 etapas**: duas instâncias Fastify paralelas em HTTP loopback real, credenciais e schemas Prisma distintos no PG17 descartável, barreiras de sincronização, acesso cruzado negado, disputa pelo mesmo lançamento/revisão (200 + 409), IDs/valores preservados e limpeza final. Auth simulada, sem APK instalada.
- [Actions #44092200586](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44092200586) **SUCCESS, 27 etapas**: primeira versão da disputa pela mesma revisão; depois expandida para HTTP loopback.
- A tentativa anterior [#44091761244](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44091761244) teve **falha de TypeScript** no teste QA, corrigida antes dos gates verdes.
- Detalhes, limites e próximos gates: `docs/MEG-STAGE10-CONCORRENCIA-HTTP-QA-20261117.md`.
- **Marco 5 ainda NÃO concluído**: o Android instalado, JWT real e coexistência de dados reais não foram homologados. **40% técnico, 0% migração produtiva**.


## 17/11/2026 | Evidência REAL Supabase e APK, sem migração
- Catálogo real: 3.035 candidatos técnicos de categoria por owner+tipo+nome+grupo, menos 2 sentinelas 'Sem categoria' = **3.033 revisáveis**, e 591 sem correspondência. Formas de pagamento: **2.900** candidatos técnicos, **612** exceções (496 'Não informado', 116 'CARTÃO LATAM PASS').
- Recorte conservador: **649** lançamentos monetários à vista com ambas as correspondências técnicas mas ainda não aprovadas; **2.157** com par técnico e marcação de crédito/cartão/benefício exigem política específica.
- **Risco financeiro confirmado:** 1.855 casos históricos de modalidade CREDITO com candidato PaymentMethod.type='other', e 278 Verocard/benefício com candidato type='credit'. [Issue #700](https://github.com/MarcosVilalva/MEG-Platform/issues/700). Teste de caracterização de financial-policy aprovado em [CI #44097355894](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44097355894), sem escritor alterado. Nenhum saldo atual foi declarado incorreto.
- **Android publicado:** APK 2.0.708, pacote br.com.megfinancas.app, hash SHA256 1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6; host embutido **meg-platform-api.onrender.com**, verificado em [CI #44096487998](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44096487998). Não comprovada versão instalada; issue #699 continua P0.
- **Segurança da base real:** 32/32 tabelas public com RLS on, 0 políticas, 0 privilégios diretos anon/authenticated; isso não prova segurança de todos os writers Prisma. Advisors: pg_net em public, 9 FKs sem índice, 13 índices estatisticamente não usados. Não modificar sem revisão.
- Script auditável: scripts/meg-stage10-saneamento-real-readonly.sql, BEGIN TRANSACTION READ ONLY. Relatório: docs/MEG-STAGE10-DIAGNOSTICO-REAL-DB-APK-20261117.md.
- **Indicador mantém 4/10 = 40% técnico, produção 0%.** Marcos 5, 7, 8 ainda pendentes de comprovação funcional e revisão de regra; nenhum UPDATE executado.


## 17/11/2026 | Gate QA fail-closed e SQL real confirmado
- [CI #44102527881](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44102527881) **SUCCESS**: `stage10-historical-mapping-review.ts` triagem conservadora de FKs sem writer, nunca `writeAuthorized:true`; teste PG17 cria evento fictício, associa FKs, prova valor/sinal/status/IDs preservados e ROLLBACK integral. Sem migração real.
- SQL `scripts/meg-stage10-low-risk-647-readonly.sql` executado via transação READ ONLY no Supabase real: **649** candidatos ordinários, **2** exceções sinal positivo, **647** somente para revisão explícita (511 expense paid, 135 expense planned, 1 income paid), 0 contas fora do titular/inativas, 0 dependências ledger/recibo/baixa/importação. Não elevar marco de revisão 7.
- **1.855** crédito com candidato tipo other: 1.729 paid + 126 planned; **278** Verocard/benefício com candidato tipo credit: todos paid. Potencial choque semântico, não é prova de saldo incorreto. Ver docs/MEG-STAGE10-GATE-MAPEAMENTO-647-20261117.md e issue #700.
- [CI #44103544308](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44103544308) SUCCESS: APK 2.0.708 analisada por hash fixo. `server.url` Capacitor remoto AUSENTE; JS local incorpora app-state/PATCH/409. Um ramo 409 com retries limitados pertence, pela resposta `preference/synced`, à sincronização de preferências, **não foi demonstrado como outbox de lançamento**. A versão realmente instalada é desconhecida; última confirmação explicitamente registrada: 1.1.167 em 26/08. Ver docs/MEG-STAGE10-APK-409-CONTRATO-REAL-20261117.md e issue #699.
- **40% técnico (4/10 marcos), 0% migração produtiva**; Android, API compartilhada Render e main intactos, PR #697 Draft, sem deploy/merge.
