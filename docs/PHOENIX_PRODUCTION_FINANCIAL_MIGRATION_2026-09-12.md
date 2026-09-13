# Phoenix V15 — resultado da migração financeira real

Data: 12/09/2026
Banco: Supabase `meg-financas` (`sa-east-1`)

## 1. Auditoria de propriedade

A auditoria foi executada diretamente no PostgreSQL real antes de qualquer backfill.

Estado inicial normalizado:

- `Account`: 0 registros;
- `Category`: 47 registros;
- `PaymentMethod`: 15 registros;
- `FinancialEvent`: 6.471 registros;
- `AppState`: 1 registro;
- um único proprietário financeiro identificável.

Não foram encontrados catálogos utilizados por múltiplos proprietários nem referências financeiras sem proprietário.

Das 47 categorias, 27 possuíam referências normalizadas e 20 não possuíam referência normalizada. As 20 restantes estavam presentes no catálogo `groups` do único `AppState`, portanto também possuíam evidência de propriedade e não eram órfãs.

## 2. Fase 1 — propriedade explícita

A migration `phoenix_catalog_ownership_phase1` foi aplicada com travas de segurança.

Resultado:

- 47/47 categorias com `userId`;
- 15/15 formas de pagamento com `userId`;
- FKs e índices de escopo criados;
- nenhuma alteração em `FinancialEvent` nesta fase.

## 3. Contas canônicas

O `AppState` possuía exatamente duas contas estruturadas e IDs estáveis:

- `account-monetary-main` — Conta monetaria principal — tipo normalizado `checking`;
- `account-benefit-verocard-food` — Verocard Alimentacao — tipo normalizado `benefit`.

Ambas possuíam `openingBalance = 0` e estavam ativas.

A migration `phoenix_materialize_legacy_accounts_phase2a` materializou essas duas contas preservando seus IDs e proprietário.

## 4. Vínculo histórico de conta

As 3.633 transações do `AppState` possuíam `financialAccountId`, 3.633 IDs distintos e correspondência exata 1:1 com 3.633 `FinancialEvent.legacyTransactionId`.

Os 2.838 eventos restantes eram exatamente eventos ligados a `ImportedRow`.

Após o hotfix de produção que preserva `financialAccountId -> FinancialEvent.accountId`, a migration `phoenix_backfill_financial_event_accounts_phase2b` foi aplicada.

Distribuição obtida:

- AppState / conta benefício: 293;
- AppState / conta monetária: 3.340;
- ImportedRow / conta benefício: 229;
- ImportedRow / conta monetária: 2.609;
- total: 6.471;
- eventos sem conta: 0;
- divergências de proprietário da conta: 0.

## 5. Duplicidade de projeção importada

A paridade financeira revelou que `ImportedRow` não era uma segunda fonte financeira independente.

Dos 2.838 eventos importados, 2.819 possuíam correspondência exata no AppState por data + descrição + valor. Os 19 restantes eram registros históricos da importação que já não coincidiam com o estado vivo.

O próprio `AppState.__megNormalization.mode` estava em `normalized-primary`, com 3.633 transações. Além disso, os 2.838 eventos importados possuíam:

- 0 vínculos com `Receipt`;
- 0 vínculos com `PayablePayment`;
- 0 vínculos com `LedgerEntry`;
- 0 auditorias financeiras próprias.

Por isso a migration `phoenix_archive_import_shadow_events` definiu `archivedAt` apenas nesses 2.838 `FinancialEvent`, sem `DELETE` e sem remover `ImportedRow`.

Estado ativo após a correção:

- `FinancialEvent` ativos: 3.633;
- ativos originados do AppState: 3.633;
- ativos sem conta: 0;
- sombras de importação preservadas e arquivadas: 2.838.

## 6. Fixture de julho

Os valores `R$ 6.037,46` realizado e `-R$ 1.696,28` projetado não são uma fotografia atual do banco. Eles são um fixture de regressão que comprova a fórmula monetária usando:

- saldo anterior: R$ 882,81;
- receitas realizadas: R$ 9.574,31;
- despesas realizadas: R$ 4.419,66;
- despesas previstas: R$ 7.733,74.

A fotografia real atual de julho, após retirar a projeção duplicada e usando a conta patrimonial como autoridade, é:

- saldo monetário anterior a julho: R$ 772,81;
- resultado realizado em julho: R$ 364,77;
- fechamento realizado: R$ 1.137,58;
- resultado projetado de julho: R$ 364,77;
- fechamento projetado: R$ 1.137,58.

Os dois valores devem permanecer separados conceitualmente: fixture = teste da regra; fotografia do banco = dados atuais.

## 7. Opening balance e benefício

A política Phoenix passa a tratar a conta como autoridade patrimonial:

- `checking`, `savings` e `cash` participam do caixa monetário;
- `benefit`, `credit` e `investment` não inflam o saldo disponível para pagamentos;
- conta `benefit` exclui seus eventos do caixa mesmo quando a descrição não contém `VEROCARD`;
- heurística por forma de pagamento/descrição permanece apenas como fallback legado.

Como as duas contas reais atuais possuem `openingBalance = 0`, a promoção de saldo inicial não altera numericamente o patrimônio atual.

## 8. Ledger

O banco possui zero `LedgerEntry` históricos. Não será criado um ledger retroativo sintético para os 3.633 eventos legados sem uma evidência contábil independente.

Decisão: `FinancialEvent` permanece a fonte histórica; `LedgerEntry` será prospectivo para novas operações normalizadas que exigem movimentação por conta, especialmente transferências.

## 9. Próximos gates

- validar CI da política patrimonial e transferência;
- manter a rota de transferência sem consumo pela UI até o contrato passar por completo;
- adicionar índices de leitura da Phoenix antes do corte, especialmente `FinancialEvent(userId, archivedAt, date)` e `FinancialEvent(accountId, archivedAt, date)`;
- validar visualmente a Phoenix contra o V15;
- liberar escrita seletivamente, fluxo por fluxo.
