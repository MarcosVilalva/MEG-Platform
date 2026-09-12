# Phoenix V15 — gate de migração dos catálogos

Data: 12/09/2026

## Risco de ordem de deploy

A branch Phoenix já prepara `Account`, `Category` e `PaymentMethod` para propriedade por `userId`, e as rotas novas passam a listar e validar os catálogos no escopo do usuário autenticado.

A produção atual ainda possui esses três catálogos globais, sem `userId`.

Portanto, **não é seguro simplesmente mesclar a Phoenix e deixar o Render executar `db:push`**. Depois da criação das colunas, os registros legados nasceriam com `userId = NULL`; como a API Phoenix filtra por proprietário, os catálogos poderiam ficar temporariamente invisíveis e as mutações seriam rejeitadas.

Além disso, o build atual do Render executa:

`db:prepare:production -> db:push:production`

O `prepare-production` atual foi criado para deduplicação de orçamentos e não resolve propriedade de catálogos. Logo, ele não deve ser usado como mecanismo implícito para este backfill.

## Ordem segura obrigatória

1. Executar `catalog-ownership-audit.sql` no Supabase em modo somente leitura.
2. Conservar o relatório bruto e revisar todos os `MULTI_OWNER`, `REVIEW_OWNERLESS` e `NO_REFERENCE`.
3. Não modificar a produção enquanto existir propriedade ambígua não resolvida.
4. Preparar uma migração específica e transacional com o mapa de propriedade aprovado.
5. Antes da migração, confirmar backup/recuperação disponível no provedor.
6. Adicionar `userId` de forma inicialmente anulável aos três catálogos.
7. Preencher proprietários inequívocos.
8. Para `MULTI_OWNER`, clonar o catálogo por proprietário e religar somente as referências daquele usuário.
9. Validar que nenhuma referência aponta para catálogo de outro proprietário.
10. Validar zero catálogos obrigatórios sem proprietário antes de mudar qualquer leitura para modo estrito.
11. Reexecutar a auditoria e conservar o relatório pós-migração.
12. Somente depois permitir deploy da API que filtra catálogos estritamente por `userId`.
13. Depois do deploy, repetir smoke tests de login, listagem de catálogos, Dashboard, Lançamentos, Pendentes, Cartões e Recebimentos.
14. Só então considerar `openingBalance` apto para entrar na política monetária.

## Regra de rollback

Se qualquer verificação pós-migração divergir da contagem/referências anteriores, interromper o corte. Não liberar escrita Phoenix e não tentar corrigir por exclusão ou atribuição manual em massa.

A migração deve preservar os IDs originais quando houver proprietário único e criar IDs novos apenas para clones exigidos por compartilhamento legado.

## Gate de aprovação técnica

Nenhum destes passos é substituído por `prisma db push` automático. O backfill é uma migração de dados, não apenas de schema, e deve ter relatório antes/depois.
