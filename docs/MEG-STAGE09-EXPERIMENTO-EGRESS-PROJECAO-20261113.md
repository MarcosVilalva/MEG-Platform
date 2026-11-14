# MEG Etapa 09 | Experimento isolado de redução do Shared Pooler Egress

**Data:** 13/11/2026. **Status:** EXPERIMENTAL, sem autorização de merge ou deploy.

## Autoridade e escopo

- Repositório: `MarcosVilalva/MEG-Platform`.
- Base imutável: commit `6f131d69731c06f1f4137f6a8f06a7d07caf92be`, PR #666 Draft.
- Branch experimental: `experiment/stage09-egress-projection-20261113`.
- Produção Render `meg-platform-api` não foi modificada, assim como Supabase de produção, Android e Web homologada.
- Gates: Gate 1 PARCIAL; Gates 2, 3, 4 NO-GO.
- Autoridade financeira: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.
- Evidência de consumo da organização Supabase: 13,057 GB no ciclo 27/10 a 27/11, dos quais 13,002 GB em produção; 100% Shared Pooler nos pontos observados em 05/11 e 12/11. Os registros não atribuem bytes a consultas individuais.

## Alteração proposta

Arquivo: `apps/api/src/modules/app-state/normalized-primary-writeback.ts`.

A consulta `tx.financialEvent.findMany` de eventos ativos, usada em `reconcilePrimaryAppStateFromNormalized`, retorna hoje todos os campos de `FinancialEvent`, além do nome do meio de pagamento. O espelho usa apenas `id`, `legacyTransactionId`, `date`, `description`, `type`, `status`, `amount`, `signedAmount`, `notes`, `sourcePayload`, `accountId` e `paymentMethod.name`. A experiência substitui `include` por projeção Prisma `select` com exatamente esses campos.

**Preservados:** transação, `updateMany` com revisão esperada, detecção de divergências em `sourcePayload`, exclusões de eventos arquivados e órfãos, sinal de estorno, histórico de auditoria, fingerprint e toda lógica de saldo. Não reduz o timer de 15 minutos e não remove `sourcePayload`.

## Caracterização sintética offline (sem rede)

Harness local independente: `MEG-STAGE09-EXPERIMENTO-PROJECAO-20261113.mjs`; fixture sintética de 3.630 eventos com campos de `FinancialEvent`. Testa igualdade dos espelhos, decisões de refresh, IDs e fingerprint para payloads de 256, 512, 1024 e 2048 bytes nominais, bem como estorno, receita, pagamento e meio de pagamento nulo.

| Payload alvo fictício | JSON da linha completa | JSON com select | Redução estimada dessa consulta |
|---|---:|---:|---:|
| 256 B | 3,70 MB | 2,24 MB | 39,55% |
| 512 B | 4,58 MB | 3,11 MB | 31,96% |
| 1024 B | 6,44 MB | 4,97 MB | 22,73% |
| 2048 B | 10,15 MB | 8,69 MB | 14,41% |

**Limitação:** a medida é somente `JSON.stringify` sintético, não bytes reais em PostgreSQL/Supavisor. É redução potencial **de uma consulta** feita na inicialização, não redução total do Egress, nem garantia de ficar abaixo de 5 GB.

## Validações

- Teste offline Node: PASS.
- Teste de caracterização no repositório: ampliado em `normalized-primary-writeback.test.ts` para validar projeção e equivalência da reconstrução, atualização de sourcePayload e fingerprint.
- CI da branch experimental: ainda requer execução e verificação. Um build verde não equivale a homologação funcional.
- Teste com PostgreSQL 17 local isolado e métricas do protocolo: pendente.
- Prova da causa quantitativa dos 13 GB, verificação operacional da quota e gates de recuperação: pendentes.

## Critérios antes de cogitar integração

1. Build TypeScript e teste `test:app-state` verdes na branch experimental.
2. Regressão financeira mais ampla verde, sem alteração de saldo, parcela, benefício, cartão, idempotência, ledger, transferência ou histórico.
3. Medição confiável de bytes e consultas no PostgreSQL isolado, incluindo resultado após escrita concorrente e rollback.
4. Avaliação explícita da redução real de Egress e autorização separada antes de qualquer merge ou deploy.
5. Preservar PR #666, issues #674/#676, Android e telas aprovadas.

## Restrições

Nenhuma alteração em `main`, serviço Render, Supabase produtivo, ambiente WSL, Android ou Web homologada. Nenhuma operação destrutiva, testes de carga em produção, mudança de plano, restore/backup ou atualização de segredo.
