# MEG Web Evolution — Etapa 10 | Auditoria inicial e bloqueios de escrita
Data: 12/11/2026
Status: primeira fase, leitura/contratos; SEM formulário homologado, SEM API de produção, SEM release.

## Fontes e hierarquia
1. Regras financeiras atuais de `apps/api` e autoridade em `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.
2. Prints oficiais atuais dos modais Novo Lançamento / Editar Lançamento.
3. Prompt Master e checkpoint de 12/11 da branch `integration/09-web-home-p0-20261111`.

Base visual imutável: `preview/09-lancamentos-home-p0-qa-20261111@760b7ad0e3217dbab70ea426df9cad67318f79ef`.
A homologação foi do Shell universal e das telas anteriores, não da nova UI.
Esta branch `stage10/new-edit-launch-20261112` não deve alterar arquivos homologados nem publicar serviço produtivo.

## Matriz de regras (intervalos de referência, verificar em SHA da base)
| Regra | Arquivo / linha de referência | Comportamento observado | Consumidores exigidos / preservados |
| --- | --- | --- | --- |
| Status receita, Fixo e crédito | `apps/api/src/modules/finance/financial-policy.ts:101-121` | Receita paga; Fixo pago; despesa crédito planned prevalece | Novo/Editar, Pendentes, Home, Lançamentos |
| Sinal e centavos | `apps/api/src/modules/finance/amount-sign.ts:1-14`; `financial-policy.ts:50-98` | Normalização do sinal e comparação do saldo em centavos | Resumo, todas as telas |
| Criação genérica | `apps/api/src/modules/finance/event-mutation.ts:43-192`; `finance/routes.ts` | Writer serializável, operação idempotente e duplicidade semântica; rejeita transferência e benefício | Formulário despesa à vista/receita, quando autorizado |
| Edição/arquivamento genérico | `apps/api/src/modules/finance/service.ts:185-315`; `finance/routes.ts` | PATCH em transação, exclusão restrita a ADMIN/MANAGER; bloqueio de vínculo com outros domínios | Editar/Excluir, somente após caracterização |
| Benefício | `apps/api/src/modules/finance/benefit-event-mutation.ts:76-402`; `benefit-event-routes.ts` | Writer exclusivo, conta BENEFIT, método Verocard, status paid, saldo suficiente, versão em edição | Alimentação, histórico de Benefícios |
| Cartões/parcelas | `apps/api/src/modules/cards/routes.ts:275-560`; `cards/service.ts:131-586` | Compra formal e edição individual; bloqueia compra paga/parcial; parcela unitária aberta | Cartão, compras, faturas, edição |
| Competência/fatura | `apps/api/src/modules/finance/card-statement-canonical.ts:126-288` | Fechamento, vencimento, fim de semana, dedup de legados | Cartões e resumos |
| Pendentes | `apps/api/src/modules/payables/create-service.ts:19-104`; `payables/service.ts:66-374` | Baixa protegida, parcial/total e auditoria | Pendentes e status do formulário |
| Lote genérico | `apps/api/src/modules/finance/event-bulk-mutation.ts:180-378` | Até 200 FinancialEvent; NÃO é lote CardPurchase | Lançamentos, futura edição múltipla |
| Resumo e saldo | `apps/api/src/modules/finance/read-model.ts`, `monetary-protection.ts` | Autoridade exclusiva para resumos/saldos; nunca calcular na interface | Todas as telas |

## Obrigações de negócio da Etapa 10
- Autocomplete por descrição recupera categoria, conta e método de pagamento com seleção explícita, NUNCA valor nem data. Históricos sem IDs de catálogo não são associados por suposição.
- Alimentação aplica Conta Benefício + Verocard + Pago e não movimenta conta monetária. Esta regra de negócio tem precedência sobre exemplos contraditórios do print.
- Receita/Fixo realizados; crédito planejado até fatura; status é resposta do domínio. Pendente é exceção explícita.
- Visual de Despesa/Receita/Alimentação deve partir da mesma estrutura de formulário; cartão/benefício usam writers próprios.
- Crediário excluído da nova Web pela decisão de 06/10/2026; não reutilizar.
- Exclusão só respeitando papel/permissões do servidor, confirmação e eventual vínculo de domínio.

## Lacunas/riscos reportados, SEM correção
1. **Edição monetária genérica:** `updateFinancialEvent` não usa `serializableFinancialTransaction`, não requer `operationId`/versão e não reaplica `resolveCanonicalFinancialStatus`; não ativar alteração livre de conta, status, tipo, categoria ou método em UI sem contrato seguro.
2. **Criação monetária marcada como paga:** `createFinancialEventProtected` não chama diretamente `monetaryAccountBalanceAt` nem `paymentBalanceDecision`. Não afirmar proteção de saldo suficiente nem habilitar quitação irrestrita só com base no nome do writer. Analisar a interação com ledger e proteções antes.
3. **Benefício vs produto geral:** política atual reconhece Verocard nominalmente. A interface do seletor deve ser genérica (Ticket/Alelo/outros), mas a vinculação automática Alimentação=Verocard é contrato atual específico que não pode ser generalizado por inferência.
4. **Edição múltipla de compras formais:** nenhum writer atômico de várias `CardPurchase/CardInstallment` foi comprovado; proibido simular com vários PATCHs.
5. **Edição de vencimento de cartão:** risco de efeito retroativo em faturas passadas; não inserir alteração em massa sem teste e contrato.
6. **Autocomplete Web novo:** contrato operacional não localizado; a regra documental existe, mas não confundir pesquisa de texto local em mock com fonte de histórico autenticada completa.
7. **Exclusão de evento benefício:** rota específica DELETE não comprovada. Não reutilizar exclusão genérica.
8. **Histórico legado:** `sourcePayload` pode ter categoria e forma de pagamento sem ID; exibir o rótulo, jamais promover para vínculo autoritativo automaticamente.

## Gate inicial
- Teste novo: `scripts/meg-stage10-write-contract-characterization.test.ts`, somente política pura + asserções estáticas. Não testa HTTP transacional/concorrência em banco efêmero.
- Teste herdado: `scripts/meg-stage09-card-nextstage-characterization.test.ts`; conservar.
- Próxima fase apenas após gate: protótipo VISUAL em preview estática, dados sintéticos, sem ação financeira real, preservando o seletor homologado.
- E2E autenticado, validação de concorrência, rollback, saldos e edição específica ainda pendentes.

## Bloqueios de release
PRs #656/#663/#666/#669/#672/#673 continuam separadas e Draft. Render API produtiva tem Build Command com `db:prepare:production` e `db:push:production` (incluindo `--accept-data-loss`). **Sem merge, deploy produtivo, execução de migration, banco real, alteração de API ou Android**. Visual de Etapa 10 exige aprovação expressa futura.

