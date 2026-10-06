# MEG Web Evolution — Contrato da Fonte Única de Dados

## Objetivo

A Etapa 02 estabelece uma única fonte de estado para a nova Web, sem criar uma segunda camada de regras financeiras no cliente.

A fonte vive em `apps/web/src/evolution/data/` e recebe dados das autoridades registradas em `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.

## Coleções canônicas da Web

- `accounts`
- `transactions`
- `payables`
- `cards`
- `installments`
- `statements`
- `benefits`
- `transfers`
- `categories`
- `classifications`
- `paymentMethods`

Todas usam ID estável. Referências entre entidades são verificadas por `validateMegDataSource`.

## Read models

`readModels.summary`, `cashflow` e `analytics` são respostas da autoridade `apps/api/src/modules/finance/read-model.ts`. A Web não recalcula saldo, competência, fatura, limite ou status para substituir esses contratos.

`benefitSummary` permanece separado porque ainda não existe read model de benefício declarado como autoridade canônica na Etapa 01. O endpoint atual é de compatibilidade e não será promovido silenciosamente.

## Classificações

O banco atual não possui catálogo `Classification` próprio. Existem atributos de classificação no evento e dados históricos em `sourceDetails`. Portanto, a coleção `classifications` permanece vazia até existir fonte oficial. Nenhum catálogo será inventado para satisfazer a UI.

## Mocks

`megMockData` nasce vazio. Valores fictícios usados em testes ficam restritos às fixtures de contrato e nunca alimentam a aplicação.

## Derivações permitidas

O cliente pode fazer seleção, agrupamento, contagem e soma de valores já normalizados para refletir filtros da UI.

Não é permitido implementar localmente:

- saldo disponível;
- saldo pós-operação;
- competência;
- cálculo de fatura;
- limite comprometido/disponível;
- baixa;
- parcelamento;
- regra de status;
- proteção de saldo.

Esses valores vêm das autoridades financeiras da API.
