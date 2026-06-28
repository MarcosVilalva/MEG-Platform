# Domain Layer

A Domain Layer é o núcleo de regras do MEG.

Ela não depende de:

- React
- Fastify
- Prisma
- SQLite
- APIs externas

## Conteúdo

- Entidades:
  - Account
  - Category
  - FinancialEvent
  - LedgerEntry
  - PaymentMethod

- Value Objects:
  - Money
  - Competence
  - Period

- Domain Services:
  - LedgerService
  - BalanceService

## Regra principal

O saldo não deve ser alterado diretamente.

O saldo é consequência dos eventos financeiros e das partidas de ledger.
