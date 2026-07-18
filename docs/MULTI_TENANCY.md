# Arquitetura multicliente do MEG

## Objetivo

O MEG continua sendo um produto de finanças pessoais. A evolução comercial permite atender vários clientes sem compartilhar lançamentos, saldos, cartões, relatórios ou configurações entre eles.

## Unidade de isolamento

Cada cliente possui um `Workspace` (espaço financeiro). Usuários acessam um espaço por meio de `WorkspaceMember`, com perfil e status próprios. O estado financeiro usado pela interface atual pertence ao espaço, nunca ao usuário autenticado isoladamente.

## Migração do ambiente de Marcos

- O administrador `m_vilalva@hotmail.com` é o proprietário do espaço `marcos-financas`.
- A base já existente é vinculada a esse espaço sem copiar, regravar, recalcular ou zerar o JSON financeiro.
- Usuários já aprovados no ambiente anterior tornam-se membros desse mesmo espaço.
- A operação é idempotente: novas execuções não duplicam o espaço, membros ou estado.

## Primeiro acesso de um novo cliente

Ao selecionar **Criar meu espaço financeiro**:

1. é criado um usuário administrador ativo;
2. é criado um espaço financeiro exclusivo;
3. é criado um estado vazio com `transactions: []` e `budgets: {}`;
4. a sessão é iniciada automaticamente;
5. nenhum dado de Marcos ou de outro cliente fica visível.

O fluxo **Entrar na equipe de Marcos** mantém o pedido de acesso com aprovação administrativa. Convites direcionados a outros espaços serão acrescentados no próximo marco.

## Regras de segurança obrigatórias

- Consultas e gravações de `AppState` usam `workspaceId` derivado da sessão autenticada.
- Listagem, aprovação, bloqueio, exclusão, redefinição de senha e teste de e-mail só alcançam membros do mesmo espaço do administrador.
- O proprietário do espaço não pode ser bloqueado nem excluído pelo painel.
- A automação envia uma execução por proprietário de espaço, evitando mensagens duplicadas por membro.
- Novas tabelas financeiras normalizadas devem receber `workspaceId` antes de serem consideradas multicliente.

## Estado da implementação

Esta entrega implementa a fundação multicliente compatível com o sistema legado. Ainda são próximos marcos: convites por espaço, contas bancárias e saldo inicial, administração comercial, planos e cobrança, e migração das entidades financeiras normalizadas para `workspaceId`.