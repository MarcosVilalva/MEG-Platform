# Etapa 10.5 | Fase B | Inventário inicial verificável e contrato de isolamento

**Data:** 24/11/2026. **Estado:** FASE B AUTORIZADA, INVENTÁRIO INICIAL; NÃO É APROVAÇÃO DE SCHEMA-ALVO OU MIGRAÇÃO.
**Escopo de leitura:** branch Draft PR #705, `packages/database/prisma/schema.prisma`, `apps/api/src/modules/app-state/routes.ts`, `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, `packages/database/prisma/supabase-rls-hardening.sql` e diagnóstico de 17/11/2026. Nenhuma consulta nova a produção.

## Inventário estático inicial

- Prisma: **33 models**, **4 enums**, **54 declarações de relacionamentos `@relation`**, **52 índices/chaves compostas `@@index/@@unique/@@id`** e **13 colunas com `@unique`** na versão inspecionada; contagem de texto-fonte, não de tabelas/constraints realmente existentes no banco.
- Modelos: `User`, `AppState`, `Workspace`, `CloudMutationReceipt`, `WorkspaceMember`, `PlatformAdministrator`, `Plan`, `WorkspaceSubscription`, `WorkspaceNotificationConfig`, `WorkspaceInvoice`, `NotificationDelivery`, `NotificationRecipient`, `NotificationEmailRecipient`, `AuthSession`, `Account`, `Category`, `PaymentMethod`, `FinancialEvent`, `LedgerEntry`, `Customer`, `Receivable`, `Receipt`, `Budget`, `AuditLog`, `ImportBatch`, `ImportedRow`, `CreditCard`, `CardPurchase`, `CardInstallment`, `Payable`, `PayablePayment`, `RecurringExpense`, `CardLimitControl`.
- `AppState.state` é `Json`, com `revision`; identidade canônica e projeção legada coexistem. `FinancialEvent` possui `legacyTransactionId` e chave única composta por `workspaceId, legacyTransactionId`; `LedgerEntry` referencia evento e conta.
- `CloudMutationReceipt`: UNIQUE(`workspaceId`, `operationId`), `requestHash`, `response`, revisão e expiração. Sua expiração cronológica **não** prova expurgo automático. Decidir política de retenção e proteção após remoção, respeitando LGPD.
- `AuditLog` contém autor, entidade, ação, metadados e data; a estrutura Prisma isolada não prova imutabilidade, proteção contra UPDATE/DELETE ou cadeia de integridade.

## Rotas e clientes: pontos de atenção identificados

- `PATCH /app-state/transactions`: `apps/api/src/modules/app-state/routes.ts:280`, `operationId` opcional no schema (linha 49) e UUID substituto gerado por requisição (linha 287); transação serializável + recibo já existentes no candidato.
- `PATCH /app-state/properties`: `routes.ts:441`, contrato distinto de propriedades; preservar atomicidade e recibo.
- `PUT /app-state`: `routes.ts:461`, atualização por revisão, **sem** recibo equivalente no contrato legado; incompatibilidade requer tratamento explícito.
- `apps/web/src/instant-persistence.js`: ponte de persistência do estado e outbox local, com identificação e replay. `phoenix-create-attempt-journal.ts`: journal de intenções Phoenix; preservar garantias IndexedDB e localStorage comprovadas em PT212.
- Android: bundle Web embarcado em APK via `capacitor.config.ts` (`webDir: apps/web/dist`), sem URL de front remoto. APK708 não deve sofrer alteração. É obrigatório inventariar versão/protocolo de cada APK antes de exigir novos cabeçalhos/campos.

## Segurança: RLS não é equivalente a isolamento efetivo da API

O SQL `packages/database/prisma/supabase-rls-hardening.sql` registra que a API atual usa role `postgres` com `BYPASSRLS`; `anon` e `authenticated` não são identidades do MEG. Antes de desenhar políticas: definir role efetiva sem bypass, como a conexão Prisma receberá contexto autenticado de workspace sem vazamento entre transações, e como grants/funções/backups serão segregados. **Não aplicar `FORCE RLS`, policies ou troca de role em produção nesta fase.**

## Autoridades financeiras que a Fase B não pode substituir

`financial-policy.ts`, `monetary-protection.ts`, `opening-balance.ts`, `read-model.ts`, `event-mutation.ts`, `benefit-event-mutation.ts`, `transfer-service.ts`, `payables/service.ts`, `cards/service.ts`, `pending-batch-settlement.ts`. Conferir `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` antes de qualquer protótipo. Verocard é benefício pré-pago, não cartão de crédito; `OPENING_BALANCE` é a autoridade do saldo inicial.

## Dependências e inventários ainda por concluir

1. Extrair catálogos reais de constraints, triggers, defaults, roles, grants, policies e extensões **somente de réplica isolada**, não inferir do schema Prisma.
2. Construir mapa de leitura/escrita por rota, job, script, aplicativo, versão e domínio financeiro; comparar origem de dados canônica vs compatibilidade.
3. Mapear relações de `FinancialEvent` com ledger, recibos, importações, baixas, cartões, benefícios, transferências e arquivamento.
4. Especificar invariantes monetários e suites de reconciliação para snapshots autorizados, incluindo conta, competência, status, valores assinados, estorno e cardinalidade.
5. Elaborar alternativas de schema-alvo, papéis de banco e auditoria append-only, com custo de migração, compatibilidade e plano de rollback; nenhuma alternativa está selecionada.
6. Definir como a nova arquitetura representaria dados históricos sem FK canônica, especialmente #700, sem inferência nominal ou preenchimento automático.

## Limites e bloqueios

**Fase B não autoriza** migração experimental com dados reais, migração produtiva, deploy, alteração de Android estável, mudança de política de acesso, alteração de autoridade financeira, cutover ou avanço à Etapa 11. Fases C e D exigem aprovação adicional. A #699 continua P0 da Etapa 10.
