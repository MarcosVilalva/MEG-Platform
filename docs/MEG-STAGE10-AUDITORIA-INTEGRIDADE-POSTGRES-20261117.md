# MEG Finanças Web Evolution | Auditoria de integridade estrutural do PostgreSQL
**Data da consulta:** 17/11/2026. **Etapa:** 10, apenas saneamento e segurança financeira.  
**Origem dos números:** consultas SQL de leitura na base produtiva, sem capturar dados pessoais.  
**Proibições:** NÃO executar scripts QA em produção, NÃO alterar schema sem autorização, NÃO mudar Android ou realizar merge/deploy.

## Resumo factual da base real

| Medida comprovada por SELECT | Valor |
| --- | ---: |
| FinancialEvent total | 6.576 |
| Ativos | 3.731 |
| Arquivados | 2.845 |
| Ativos com legacyTransactionId | 3.630 |
| Arquivados sem workspaceId | 2.838 |
| Legados ativos com categoryId | 4 |
| Legados ativos com paymentMethodId | 118 |
| Legados ativos com LedgerEntry | 118 |
| Legados ativos com Receipt / PayablePayment / ImportedRow | 0 / 0 / 0 |
| Ativos com accountId de outro proprietário | 0 |
| Ativos com categoryId de outro proprietário | 0 |
| Ativos com paymentMethodId de outro proprietário | 0 |
| Ativos com category.type divergente do FinancialEvent.type | 0 |
| Ativos com workspace.ownerId divergente do proprietário do evento | 0 |

**Limitação importante:** ausência de desencontros entre os vínculos já preenchidos NÃO demonstra que os milhares de campos nulos estão corretamente classificados; esses campos precisam do mapeamento de negócio e não serão preenchidos automaticamente por igualdade nominal.

## Restrições reais verificadas no catálogo pg_constraint

1. `FinancialEvent(workspaceId, legacyTransactionId)` está declarada única no Prisma. Em SQL sintético, a unicidade impediu duplicação da mesma chave no mesmo workspace; a mesma ID legada pode existir em outro workspace.
2. `LedgerEntry.eventId -> FinancialEvent.id` possui **ON DELETE RESTRICT** e impede remoção direta de um evento com ledger ativo.
3. `Receipt.financialEventId`, `PayablePayment.financialEventId` e `ImportedRow.eventId` utilizam **ON DELETE SET NULL**. A exclusão do evento PODE fazer os três registros perderem silenciosamente seu lastro no `FinancialEvent`. Isso é comportamento estrutural do banco, não prova de dano ocorrido nos dados reais.
4. `FinancialEvent.accountId`, `categoryId`, `paymentMethodId` e `userId` possuem **ON DELETE SET NULL**; `workspaceId` possui **ON DELETE CASCADE**. Não alterar essas ações indiscriminadamente sem a autoridade financeira, histórico e modelo de exclusão.
5. As FKs por ID não exigem por si mesmas que conta, categoria e método pertençam ao mesmo titular do evento. A auditoria atual mostrou **0 divergências ativas**; novas escritas devem manter a validação de escopo na aplicação e poderão exigir proteção adicional no banco após verificação das regras de workspace compartilhado.

## Provas PG17 descartáveis

- `scripts/meg-stage10-identity-guard-synthetic.pg17.sql`: protótipo de trigger transitório, criado exclusivamente numa transação QA e removido por ROLLBACK. Verifica bloqueio de DELETE/identidade legada e restauração implícita, guarda dos valores/vínculos, unicidade por workspace e zero resíduos. **NÃO é migração**; ativá-lo na API compartilhada antes da issue #699 poderia quebrar Android.
- `scripts/meg-stage10-fk-delete-risk-synthetic.pg17.sql`: demonstra deliberadamente a fragilidade do SET NULL nos três tipos de referência com dados inventados. Compara com o RESTRICT do ledger. Executa rollback externo e verifica zero resíduos.
- `scripts/meg-stage10-integrity-preflight-readonly.pg.sql`: consulta agregada, apenas SELECT, para auditorias futuras; não altera banco.
- `apps/api/src/modules/finance/stage10-shadow-id-preservation.isolated.test.ts`: demonstra que o fluxo de reconstrução `shadow` não pode substituir um evento já existente, mesmo com ledger, mas aceita semear workspace vazio. O código correspondente removeu `deleteMany` do caminho `replaceNormalizedProjection` e falha fechado com `NORMALIZATION_SHADOW_REBUILD_REQUIRES_CANONICAL_MIGRATION`. Isso é correção na branch QA, não implantada.

## Decisão técnica

**Não migrar campos reais nem instalar gatilhos/constraints na base produtiva agora.** Uma guarda no banco que proíba escrita legada pode bloquear a APK Android congelada e deixar seu outbox em loop. O teste da guard confirma a possibilidade técnica de proteger a identidade, não demonstra compatibilidade de protocolo.

A ordem correta é:
1. Provar compatibilidade e isolamento dos clientes antigos sem admitir sucesso falso ou replay tardio (issue #699).
2. Concluir os contratos autenticados e permissões, sem alterar produção.
3. Revisar mapeamento histórico por ID, categoria, forma e modalidade; tratar exceções.
4. Produzir migração idempotente com backup restaurado, dry-run, bloqueio de concorrência, reconciliação e rollback específico.
5. Aplicar apenas com autorização produtiva separada, CI e aprovação funcional/visual.

**Estado do indicador:** 4/10 marcos (40% técnico), migração produtiva 0%. Marco 5 ainda bloqueado.


## Evidências de execução final desta auditoria
- [Actions #44085364186](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44085364186): **SUCCESS** da primeira prova de bloqueio de identidade/FK em PG17; o trigger foi revertido no próprio teste.
- [Actions #44085725365](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44085725365): **SUCCESS** da prova negativa do comportamento das FKs SET NULL e do RESTRICT no ledger, com rollback.
- [Actions #44086462524](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44086462524): **SUCCESS** depois de retirar a exclusão destrutiva de `replaceNormalizedProjection`; inclui `stage10-shadow-id-preservation.isolated.test.ts`, que aprova a semeadura inicial e rejeita reconstrução sobre eventos existentes, com FKs e ID preservados. Regressões financeiras, Fastify HTTP e TypeScript também passaram.
- Duas tentativas anteriores de CI com o novo teste shadow falharam **antes de iniciar jobs** por YAML inválido (nome do passo com dois-pontos sem aspas); corrigido no commit `2672d8a534b71827e7be4abea904ef0bd7bc2929`. Não eram falhas financeiras e não devem ser contabilizadas como testes aprovados.

**Estado:** provas técnicas de integridade em QA aprovadas; ainda não é uma proposta de ativação de trigger no banco real. A compatibilidade de Android e a autorização de dados reais continuam pendentes.
