# Project Phoenix

Sprint 004 — reconstrução estrutural do MEG.

## Objetivo

Transformar o MEG em uma plataforma com API, banco de dados e domínio persistente.

## Camadas

- `apps/web`: interface React.
- `apps/api`: API Fastify.
- `packages/database`: Prisma + SQLite.
- `packages/core`: engines e regras de negócio.
- `packages/ui`: design system.
- `docs`: decisões, arquitetura e guias.

## Princípio

A interface não é fonte da verdade.

A fonte da verdade passa a ser:

API → Services → Prisma → SQLite/PostgreSQL.
