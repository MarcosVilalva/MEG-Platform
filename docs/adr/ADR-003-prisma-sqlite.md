# ADR-003 — Prisma + SQLite na fase local

## Status

Aprovado.

## Contexto

Precisamos de banco real, mas ainda estamos em ambiente local.

## Decisão

Usaremos Prisma com SQLite no desenvolvimento e manteremos o caminho aberto para PostgreSQL em produção.

## Consequências

- Banco local simples.
- Migrations e schema versionado.
- Menor atrito para desenvolver.
- Migração futura para PostgreSQL com menos retrabalho.
