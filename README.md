# MEG Platform — Sprint 004 Project Phoenix

Project Phoenix cria a fundação real da plataforma: API, Prisma, SQLite e camada inicial de persistência.

## Setup inicial

```powershell
npm.cmd install
copy .env.example .env
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed
```

## Rodar API

```powershell
npm.cmd run dev:api
```

API:

```text
http://localhost:3333
```

Swagger:

```text
http://localhost:3333/docs
```

## Rodar Web

Em outro terminal:

```powershell
npm.cmd run dev:web
```

## Rodar tudo junto

```powershell
npm.cmd run dev
```

## Scripts úteis

```powershell
npm.cmd run db:studio
npm.cmd run test
```

## O que entrou nesta Sprint

- `apps/api` com Fastify.
- `packages/database` com Prisma.
- SQLite local.
- Modelos iniciais.
- Seed inicial.
- Rotas financeiras.
- ADRs.
- Documentação de API e banco.
- Preparação para o React migrar do LocalStorage para API.
