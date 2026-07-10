# ADR-001 — Monorepo modular

## Status

Aceita.

## Contexto

Frontend, API, banco e motores financeiros precisam evoluir juntos sem misturar responsabilidades.

## Decisão

Usar monorepo npm com aplicações em `apps/` e bibliotecas em `packages/`.

## Consequências

- contratos podem ser compartilhados;
- validação centralizada por `npm run check`;
- dependências entre pacotes devem ser explícitas;
- UI não acessa Prisma diretamente.
