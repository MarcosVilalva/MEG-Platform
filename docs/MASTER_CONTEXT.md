# MEG Platform — Contexto Mestre

## Identidade do produto

O MEG Platform é um sistema de **finanças pessoais**, preparado para atender clientes comerciais em espaços isolados. Não é um sistema de gestão pública, contabilidade governamental ou tesouraria municipal.

## Objetivo

Ajudar pessoas a registrar, compreender, planejar e melhorar sua vida financeira em uma única plataforma.

## Princípios obrigatórios

- O usuário é dono dos dados.
- A IA sugere; ações financeiras relevantes exigem confirmação.
- Saldos devem ser consequência de eventos financeiros, não valores editados arbitrariamente.
- Alterações relevantes devem ser auditáveis.
- Regras de negócio pertencem ao domínio e aos serviços, não aos componentes React.
- Nenhuma funcionalidade é considerada concluída sem código, persistência, validação e teste.
- Não remover funcionalidades existentes sem justificativa e registro de decisão.
- Não misturar regras de atividades profissionais externas com o produto de finanças pessoais.

## Stack atual

- Frontend: React, TypeScript e Vite.
- API: Fastify e TypeScript.
- Persistência: Prisma.
- Banco principal: PostgreSQL por meio do Prisma.
- Produção: PostgreSQL gerenciado no Supabase.
- Autenticação: JWT, refresh token e sessões persistidas.
- Monorepo com `apps/*` e `packages/*`.

## Estrutura principal

- `apps/web`: interface.
- `apps/api`: API HTTP.
- `packages/database`: schema Prisma e acesso ao banco.
- `packages/core`: regras financeiras compartilhadas.
- `packages/ui`: componentes visuais reutilizáveis.
- `packages/shared`: contratos e utilidades compartilhadas.

## Estado funcional conhecido

Já existem ou estão em evolução:

- autenticação e sessões;
- aprovação de novos usuários;
- perfis ADMIN, MANAGER, OPERATOR e VIEWER;
- contas, categorias e formas de pagamento;
- receitas e despesas persistentes;
- contas a receber;
- dashboard e módulos analíticos iniciais.

O estado exato deve ser confirmado no código e nas Pull Requests integradas à `main`.

## Plataforma comercial

- cada cliente possui um `Workspace` isolado;
- Marcos permanece cliente no espaço `marcos-financas` e sua base não é recriada;
- planos e licenças limitam usuários e controlam escrita sem impedir consulta e backup;
- o administrador da plataforma gerencia clientes sem abrir os dados financeiros deles;
- o administrador de cada espaço gerencia somente sua própria equipe.

Consulte `COMMERCIAL_PLATFORM.md` e `MULTI_TENANCY.md`.

## Administrador principal

`m_vilalva@hotmail.com`

Novos usuários devem solicitar acesso e aguardar aprovação. O administrador define o perfil e pode bloquear, reativar ou rejeitar acessos.

## Fluxo obrigatório de implementação

1. Ler esta documentação.
2. Confirmar o estado atual da `main`.
3. Criar branch específica.
4. Implementar banco, API, interface e regras.
5. Executar testes e build.
6. Atualizar documentação.
7. Abrir Pull Request.
8. Só integrar após CI verde.

## Comandos mínimos de validação

```bash
npm install
npm run db:generate
npm run db:push
npm run check
```

## Restrições

- Não afirmar que uma entrega está concluída sem código existente.
- Não criar dados financeiros globais quando deveriam pertencer ao usuário.
- Não armazenar segredos no repositório.
- Não usar cadastro público com acesso imediato, exceto na criação controlada do primeiro administrador.
- Não introduzir integrações externas sem isolamento por adaptadores e configuração segura.

## Próximo marco de produto

**Alpha 0.5**: núcleo financeiro pessoal integrado, com movimentações, contas a pagar e receber, cartões, fluxo de caixa, dashboard, segurança, auditoria e documentação coerente.
## Cobrança e integrações por cliente

A plataforma possui mensalidades, carência e suspensão automática, escolha de plano no onboarding e WhatsApp gerenciado centralmente pelo MEG, com destinatários isolados por workspace. Um único deploy atualiza o produto para todos sem misturar bases. Consulte `COMMERCIAL_PLATFORM.md`.
