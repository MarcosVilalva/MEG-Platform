# MEG Platform — Contexto Mestre

## Identidade

O MEG Platform é um sistema de **finanças pessoais**. Não é um sistema de gestão pública, tesouraria municipal, contabilidade governamental ou ERP público.

## Missão

Dar clareza, controle e previsibilidade à vida financeira pessoal, transformando dados em decisões práticas.

## Estado real do produto

Implementado na branch principal:

- monorepo com React, TypeScript, Vite, Fastify, Prisma e SQLite;
- build de frontend e API;
- GitHub Actions e GitHub Pages;
- autenticação com JWT e refresh token;
- perfis ADMIN, MANAGER, OPERATOR e VIEWER;
- aprovação, rejeição, bloqueio e reativação de usuários;
- contas, categorias e formas de pagamento;
- receitas e despesas persistidas;
- contas a receber e recebimentos;
- trilha inicial de auditoria;
- Dashboard e Analytics iniciais.

Ainda não concluído:

- cartões de crédito completos;
- orçamento e metas completos;
- patrimônio e investimentos;
- recuperação de senha e e-mail transacional;
- WhatsApp e notificações;
- API hospedada para a versão pública;
- substituição total de dados de exemplo;
- PostgreSQL e produção;
- Beta 1.0.

## Regra financeira central

Receita disponível do mês = saldo final do mês anterior + entradas do mês.

O texto exibido deve identificar o mês/ano do saldo transportado e seu valor.

## Segurança

- novos usuários ficam pendentes;
- o administrador principal é `m_vilalva@hotmail.com`;
- acesso depende de aprovação administrativa;
- a IA sugere, mas não executa ações financeiras sem confirmação;
- segredos nunca entram no frontend nem no Git.

## Comandos de validação

```powershell
npm install
npm run db:generate
npm run db:push
npm run check
npm run dev
```

## Definição de pronto

Uma funcionalidade só está pronta quando possui regra, persistência, API, interface, autorização, testes pertinentes e documentação atualizada.
