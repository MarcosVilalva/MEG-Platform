# Sprint 010 — Segurança das rotas financeiras

## Entregas

- autenticação obrigatória em todas as rotas financeiras;
- autorização por perfil;
- leitura permitida para ADMIN, MANAGER, OPERATOR e VIEWER;
- criação e edição permitidas para ADMIN, MANAGER e OPERATOR;
- exclusão permitida apenas para ADMIN e MANAGER;
- respostas padronizadas `401 UNAUTHORIZED` e `403 FORBIDDEN`;
- tipagem do decorator `authorize` no Fastify.

## Validação

1. `npm install`
2. `npm run db:generate`
3. `npm run check`
4. iniciar `npm run dev`
5. testar `/finance/events` sem token, com token VIEWER e com token OPERATOR.
