# MEG Etapa 10 | Issue #699 Fase A | A17, revisão humana reversível

**Estado em 24/11/2026:** ANÁLISE DE LACUNA, NÃO PASS. **PR #706:** Draft, **Issue #699:** P0 aberta. Documento estritamente técnico, sem autorização implícita para alterações de produção.

## Fontes de autoridade inspecionadas

1. `docs/MEG-ETAPA10-ISSUE699-FASE-A-CONTRATO-FINGERPRINT-SERVER-SIDE-20261124.md`, invariantes I9/I10, seções 4 e 6, matriz A11/A13/A17. Correção somente por intervenção humana explícita, auditável e contabilmente reversível; não apagar nem mesclar automaticamente eventos.
2. `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`: writers canônicos separados de eventos, cartões, benefícios, transferência e pendentes; não mover domínios para o writer de despesa.
3. `apps/api/src/modules/finance/suspected-duplicates-read.ts`: consulta autenticada e com filtro por workspace, mas `reviewStatus: 'SUSPECTED'` é constante no retorno; não representa decisão persistida.
4. `apps/api/src/modules/finance/routes.ts`: existe `GET /finance/events/suspected-duplicates`, sem rota de decisão humana/revisão/undo na Fase A. Existem PATCH/DELETE genéricos de lançamento com contratos próprios.
5. `apps/api/src/modules/finance/service.ts`: UPDATE protege `FINANCIAL_EVENT_REVERSAL_REQUIRES_CANONICAL_WRITER` para transição de despesa postada com ledger para status não postado. DELETE arquiva e remove LedgerEntry em transação, mas não há restauração canônica/testada no mesmo contrato.
6. Evidências da #707: [PR #708 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/708), [run #45476866276](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45476866276) COMPLETED/SUCCESS. SQL de hardening com CardLimitControl passa teste RLS estático e aplicação real em PostgreSQL17 descartável com roles simuladas, sem alteração de ambiente protegido.

## Conclusão estrita

- **A17_RLS_ISOLADO:** PASS na branch separada #707, ainda NÃO integrado à PR #706 e sem migração em banco protegido.
- **A17_MANUAL_REVERSIBLE_REVIEW:** NÃO IMPLEMENTADO / NÃO TESTADO. A consulta da suspeita é funcional, porém não há decisão humana persistida nem correção financeira com desfazimento comprovado.
- **A17_REGRESSAO_COMPLETA:** NÃO COMPROVADA. A suíte anterior [#45469115424](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469115424) já passou finance domain e Phoenix/mobile; falhou RLS estático anterior. Não reexecutar gates aprovados por rotina, mas validar domínios e alterações efetivamente impactados quando existir a operação de correção.

## Critérios de implementação a pactuar com a autoridade financeira antes de codificar writer de correção

- A decisão autenticada deve identificar ator, workspace, grupo de suspeita, evento original, evento indevido e justificativa, com autorização de função e idempotência.
- **CONFIRMADAS_DISTINTAS:** preservar ambos os eventos e ledgers, e persistir decisão de revisão em trilha auditável.
- **CONFIRMADA_DUPLICATA:** não arquivar por fingerprint. A escolha humana de qual evento corrigir deve usar writer financeiro canônico explícito com checagem de vínculos, saldo, fatura/parcelas e isolamento de domínio; rollback de transação em falha.
- **DESFAZER/CORRIGIR_CORREÇÃO:** fornecer operação compensatória canônica autenticada e auditada, com IDs/ledger reconciliados; não alegar reversibilidade por reabrir visualização ou alterar `reviewStatus` apenas.
- Testar sequências revisão distinta, confirmação, correção, desfazer, reenvio idempotente, duas revisões concorrentes, falha entre writer e auditoria, contas/workspaces distintos, evento já arquivado e referência financeira vinculada, exclusivamente via Fastify HTTP + JWT fictício + PostgreSQL17 descartável.
- Não ampliar a regra para Verocard, transferências, cartões, faturas, pendentes, importação e PATCH/PUT sem caracterização/autorização de cada domínio.

**Decisão operacional:** não criar endpoint destrutivo improvisado, não promover DELETE genérico a reversão, não afrouxar RLS/teste, não marcar A17 PASS antes do contrato completo. Sem merge/deploy.