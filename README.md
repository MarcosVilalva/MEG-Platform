# MEG Platform

Sistema moderno de **finanças pessoais**, voltado a controle, planejamento e tomada de decisão.

> O MEG Platform não é um sistema de gestão pública.

## Estado

O projeto está em desenvolvimento Alpha. Já possui autenticação, aprovação de usuários, perfis de acesso, cadastros financeiros, receitas, despesas, contas a receber, Dashboard e Analytics iniciais.

Frontend de demonstração:

https://marcosvilalva.github.io/MEG-Platform/

A versão pública estática não hospeda a API.

## Stack

- React, TypeScript e Vite;
- Fastify;
- Prisma;
- SQLite em desenvolvimento;
- JWT e refresh token;
- monorepo npm.

## Setup

```powershell
npm install
Copy-Item .env.example .env
Copy-Item .env packages\database\.env -Force
npm run db:generate
npm run db:push
npm run db:seed
npm run check
npm run dev
```

Web: http://localhost:5173

API: http://localhost:3333

Swagger: http://localhost:3333/docs

## Documentação

Comece por [docs/README.md](docs/README.md) e [docs/MASTER_CONTEXT.md](docs/MASTER_CONTEXT.md).

Documentos principais:

- [Visão do produto](docs/PRODUCT_VISION.md)
- [Regras de negócio](docs/BUSINESS_RULES.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Segurança](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Contexto para IA](docs/AI_CONTEXT.md)

## Qualidade

```powershell
npm run check
```

Uma funcionalidade só é considerada concluída quando existe no código, compila, passa nos testes pertinentes e tem documentação atualizada.
