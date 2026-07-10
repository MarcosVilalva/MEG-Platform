# Arquitetura

## Regra principal

> Interface apresenta. API autoriza e orquestra. Domínio valida. Persistência armazena.

## Monorepo

### apps/web

React + TypeScript + Vite. Responsável por experiência, navegação e estado de interface.

### apps/api

Fastify. Responsável por autenticação, autorização, validação, casos de uso e integração com repositórios.

### packages/database

Prisma e schema do banco. SQLite em desenvolvimento; PostgreSQL é o destino de produção.

### packages/core

Motores financeiros, projeções, analytics, decisões, ledger e regras reutilizáveis.

### packages/ui

Componentes visuais.

### packages/shared

Tipos e contratos compartilhados.

### packages/analytics

Funções analíticas.

### packages/intelligence

Insights e simulações.

## Fluxo

```text
React
  ↓ HTTPS/JSON
Fastify
  ↓ autenticação + autorização + validação
Serviços / regras
  ↓
Prisma
  ↓
SQLite (dev) / PostgreSQL (produção)
```

## Identidade

JWT de curta duração e refresh tokens persistidos. Perfis: ADMIN, MANAGER, OPERATOR e VIEWER.

## Dados

- valores financeiros usam Decimal na persistência;
- exclusões financeiras preferem arquivamento ou reversão;
- usuário é a fronteira principal de isolamento;
- ações sensíveis geram auditoria.

## Integrações

E-mail, WhatsApp, calendário, armazenamento e IA serão adaptadores de backend. O frontend nunca recebe segredos de provedor.

## Deploy

- frontend estático: GitHub Pages para demonstração;
- API e banco exigem hospedagem própria;
- CI executa testes e builds antes do merge.

## Dívidas técnicas conhecidas

- dados de exemplo ainda participam de alguns fluxos;
- testes ainda não cobrem todas as regras;
- lint precisa ser efetivado;
- Prisma 6 deve migrar sua configuração antes do Prisma 7;
- produção ainda precisa de PostgreSQL, backups e observabilidade.
