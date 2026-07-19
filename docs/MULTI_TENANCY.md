# Arquitetura multicliente do MEG

## Isolamento

Cada cliente possui um `Workspace`. Usuários acessam o espaço por `WorkspaceMember`; estado financeiro, aprovações e destinatários pertencem ao espaço autenticado. Consultas nunca recebem um `workspaceId` fornecido livremente pelo navegador: o identificador é derivado da sessão.

## Preservação da base de Marcos

- `m_vilalva@hotmail.com` é proprietário de `marcos-financas`;
- o estado financeiro existente é apenas vinculado ao espaço, sem recalcular ou zerar o JSON;
- usuários existentes permanecem membros do espaço pessoal;
- a preparação é idempotente e cria para ambientes existentes uma licença ativa padrão.

## Novos clientes

A criação gera usuário administrador pendente, workspace vazio, associação de proprietário pendente e licença pendente. Somente a Gestão comercial pode ativar ou iniciar teste. A ativação libera o responsável e envia aviso.

## Equipes

O código público do espaço é usado no pedido de entrada. O administrador do cliente aprova membros e escolhe perfis. Solicitações são recusadas quando o plano não possui vaga.

## Licença

Toda rota autenticada que grava dados valida a licença. Licenças inativas mantêm leitura e backup, mas retornam HTTP 402 em gravações. A Gestão comercial usa uma autorização separada da administração do cliente.

## Limitação conhecida

O modelo atual mantém e-mail de usuário único na plataforma. Participação do mesmo login em vários espaços já é possível pelo modelo de membros, mas a troca de espaço na interface ainda é um marco futuro.

## Migracao da estrutura financeira global

A versao global de contas e beneficios e aplicada dentro do `AppState` de cada workspace. A migracao e idempotente, executada apenas quando a versao do estado for antiga e persistida de volta no mesmo workspace. Nenhum catalogo ou lancamento e compartilhado entre clientes.
