# MEG Web Evolution — auditoria preparatória da Etapa 10: Novo/Editar Lançamento e edição em massa
**Data:** 09/11/2026  
**Status:** diagnóstico documental e inspeção estática de código, **NÃO** autorização de início da Etapa 10, de writers, merge ou deploy.  
**Base auditada:** regras de negócio válidas dos itens 7–16, 18–19 e 21–22 do PDF `MEG_Financas_Regras_Consolidadas.pdf`; `PROMPT-MASTER.txt`; `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; serviços e testes da `main` e da branch de Etapa 09. **Não usar** regras visuais históricas Android para a nova Web.

## 1. Matriz de autoridades verificadas (referência de linhas da main na consulta)
| Regra | Fonte / intervalo aproximado | Comportamento constatado | Consumo futuro |
| --- | --- | --- | --- |
| Status de receita, Fixo, crédito, pago e planejado | `apps/api/src/modules/finance/financial-policy.ts:27-40,101-121` | receita/resgate realizado; despesa via método CREDIT planejada; categoria/grupo FIXO realizada; critério de evento que movimenta saldo | Novo/Editar, Pendentes, indicadores |
| Montantes e sinais | `apps/api/src/modules/finance/amount-sign.ts:1-14`; `financial-policy.ts:50-98` | autoridade de sinais, agrupamento de valores e comparação de saldo em centavos arredondados | todos os formulários/grades, sem soma no React |
| Saldo inicial e disponível | `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` e `apps/api/src/modules/finance/monetary-protection.ts:65-120` | abertura auditável, saldo monetário por conta/data, não misturar benefício | Novo/Editar, baixa, transferência, cartão |
| Criação monetária | `apps/api/src/modules/finance/event-mutation.ts:43-192` | writer serializável, protegido, idempotente e auditável; rejeita transferência e benefício por essa rota; valida referências, status, duplicidade, lançamentos no ledger | Novo Lançamento monetário |
| Benefício Verocard | `apps/api/src/modules/finance/benefit-event-mutation.ts:76-106,106-402` | writer exclusivo, conta tipo BENEFIT, pagamento Verocard, status paid, verificação de saldo, auditoria e atualização | Alimentação/Benefício e edição |
| Transferência | `apps/api/src/modules/finance/transfer-service.ts:46-227`; `transfer-core.ts` | operação de duas pernas, idempotente, serializável, origem/destino monetários e saldo da origem | Fluxo Transferência, não escritor genérico |
| Pendências | `apps/api/src/modules/payables/create-service.ts:19-104`; `service.ts:66-374`; `finance/pending-batch-settlement.ts:192-516` | criação, recorrência, baixa com proteção de saldo e baixa múltipla inclusive fatura, bloqueio de data futura de pagamento | Novo/Editar e Pendentes |
| Cartões, parcelas e faturas | `apps/api/src/modules/cards/service.ts:131-586`; `routes.ts:20-60,294-560`; `finance/card-statement-canonical.ts:126-288` | competência pelo fechamento, vencimento por dueDay/closingDay, ajuste para próximo dia útil em fins de semana, parcelas e pagamento protegido | crédito, editar cartão/parcela, fatura |
| Edição em massa de eventos | `apps/api/src/modules/finance/event-bulk-routes.ts:14-65,124-145`; `event-bulk-mutation.ts:180-378` | até 200 IDs, versões opcionais, operação serializável, idempotência, audit log, write-back e recálculo de ledger; arquivamento só ADMIN/MANAGER | lote de FinancialEvent, nunca assumir que cobre CardPurchase |
| Consulta e integridade | `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; `apps/api/src/modules/finance/read-model.ts` | summary, cashflow e analytics via API, sem regra monetária na tela | todos os indicadores e resumos |

## 2. Regras documentais e decisões atuais
- Lançamentos cronológicos com forma de pagamento visível; autocomplete por descrição deve recuperar categoria, conta e método **sem copiar valor/data** (PDF itens 7–8). **Existência/contrato operacional do autocomplete da Web nova ainda precisa rastreamento específico**. Não declarar comprovado apenas pelo PDF.
- Despesa à vista preserva métodos cadastrados (PDF item 9); crédito ativa cartão, parcelas e fatura (item 10). A nova Web **não** deve equiparar o pagamento de cartão a uma simples despesa monetária.
- **Crediário:** PDF histórico item 11 o mantém separado, mas decisão vigente posterior de `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` de 06/10/2026 exclui crediário da nova Web. Não reintroduzir na Etapa 10.
- Alimentação: Conta Benefício + Verocard + Pago, com vínculo protegido; não movimenta conta monetária (PDF item 12 e autoridade consolidada). Verocard aparece visualmente em Cartões como pré-pago mas **não** é `CreditCard`, não tem fatura ou limite de crédito.
- Fixo realizado; Pendente é exceção explícita, a baixa só se confirma após retorno do servidor (itens 13–14). Na edição, recuperar categoria/conta/método corretos (item 15); cartão mantém parcelas, competência e visualização de parcelas (item 16).
- Icons semânticos consistentes em todas as telas, e Pendentes/Benefício integrados sem recalcular saldo na UI (itens 18,19,21,22).

## 3. Constatações de alto risco para a edição em massa e mudança de cartão/vencimento
1. Existem **dois tipos reais** de lançamento de cartão: compras formais `CardPurchase`/`CardInstallment` e eventos históricos `FinancialEvent` com `sourcePayload` / método legado. `buildCanonicalCardStatement` incorpora ambos, evita duplicar compra formal pelo `purchaseId`, e usa `statementMonth`/data do payload para o histórico. O lote genérico `/finance/events/bulk/update` **não é** um lote de compras formais.
2. `PATCH /cards/purchases/:id` aceita `cardId` e `purchaseDate` e recalc. competências conforme fechamento do novo cartão; `editablePurchase` em `apps/api/src/modules/cards/routes.ts:275-293` bloqueia compras com parcelas pagas ou parcialmente pagas. **Este bloqueio existente precisa permanecer**. A operação está implementada por compra, **não** como transferência atômica de N compras.
3. `PATCH /cards/installments/:id` permite `statementMonth`/valor para **parcela aberta sem pagamento parcial** e reconcilia `totalAmount` da compra. Não concluir que existe operação “esta e próximas” sem writer próprio e testes. Alterar `statementMonth` é diferente de mudar `dueDay` do cartão.
4. `PATCH /cards/:id` aceita alterar `dueDay` e `closingDay`. Como a fatura canônica deriva vencimento dessas configurações, **avaliar impacto em faturas históricas e parcelas previamente distribuídas antes de liberar alteração retroativa**. O código inspecionado não comprova congelamento de vencimentos históricos nessa rota. Reportar risco, não corrigir por conta própria.
5. Edição genérica em massa admite data, status, valor, categoria, conta e `legacy`. Ela recalcula ledger dentro da transação, porém não equivale a toda a validação contextual do writer de criação; **não presumir** que é segura para converter benefício, alterar método para crédito ou reclassificar fatura. Caracterizar explicitamente combinações antes de oferecer cada campo.
6. Arquivamento em massa é limitado a papéis ADMIN/MANAGER e registra auditoria. Exclusões e alterações em lançamentos vinculados a outros domínios são bloqueadas pelo backend. Manter a seleção/preview separada do botão de confirmação real.
7. O modelo atual trata `CardInstallment.status=open/paid` e `partialPaidAmount` de modo distinto. Toda alteração deve distinguir **aberta, parcialmente paga, paga, cancelada e vinculada a pagamento** sem recalcular faturas pagas.
8. O histórico ativo real auditado em 09/11 contém 3.731 registros, dos quais 3.626 sem `categoryId` e 3.512 sem `paymentMethodId`, com rótulos históricos no `sourcePayload`. Preservar rótulos originais; vincular a categoria/método de catálogo só por comando explícito, nunca apenas por igualdade textual.

## 4. Duplicações, divergências e lacunas
- **DUPLICAÇÃO FUNCIONAL / adaptação legada**: os módulos `apps/web/src/legacy-finance.js` e `packages/core/src/finance/financial-engine.ts` apresentam cálculos históricos não autoritativos. `phoenix-preview-read.ts` é compatibilidade. Não importar para a nova Web.
- **DIVERGÊNCIA DOCUMENTAL**: crediário histórico (PDF item 11) versus exclusão da nova Web (autoridade 06/10); prevalece a decisão atual.
- **RISCOS A INVESTIGAR, não bugs confirmados**: efeitos retroativos de mudança de `dueDay`/`closingDay`; recomputação de status quando método/categoria mudam em edição genérica; consistência dos eventos legados com faturas e compras formais; autocomplete funcional da nova Web; semântica de “alterar esta e próximas”.
- **LACUNA DE WRITER**: não foi localizada nesta inspeção rota específica de alteração atômica de múltiplas `CardPurchase`/`CardInstallment` preservando faturas; não simular isso por múltiplos PATCHs sequenciais. Exige projeto de contrato + testes antes de implementação.
- **LACUNA DE HOMOLOGAÇÃO**: os testes unitários/contratos existentes não substituem ensaio ponta a ponta da criação/edição com autenticação real e casos de saldo insuficiente em banco descartável.

## 5. Testes de caracterização obrigatórios antes de criar a Etapa 10
1. Competência/fatura para compras **antes/no/depois** do fechamento; dias 28–31, fevereiro bissexto, dezembro/janeiro, fim de semana do vencimento.
2. Parcelamento e arredondamento em centavos; sinal da despesa/receita/estorno; não duplicar compra formal e evento legado.
3. Alterar cartão de compra com todas as parcelas abertas: novo fechamento, competências, limite e fatura; repetir com **uma parcela paga ou parcial** para caracterizar bloqueio total existente.
4. Alterar **somente uma parcela aberta**: não afetar as demais, reconciliação do total e auditoria; “esta e próximas” permanece **NÃO IMPLEMENTADO** até contrato específico aprovado.
5. Alterar vencimento do cartão: verificar efeito calculado sobre faturas abertas e históricas e identificar exigência de versão histórica. Não assumir migração retroativa.
6. Criação monetária: receita/Fixo realizados, despesa crédito planejada; status solicitado versus canônico; validação de categoria, conta e método, duplicidade e idempotência.
7. Autocomplete: reconhecimento da descrição, categoria/conta/método recuperados, mas **nunca valor nem data**; registros legados sem IDs.
8. Alimentação: Conta Benefício + Verocard + Pago, saldo suficiente/insuficiente, recarga, impedimento de writer genérico e exclusão de saldo monetário.
9. Pendência: criar como exceção, baixa com data/conta/método, bloqueio de dupla baixa, pagamento parcial, confirmação real e auditoria.
10. Transferências: contas diferentes, saldo de origem, duas pernas atômicas, duplicidade/idempotência e data futura.
11. Edição em massa: máximo 200, seleção por IDs estáveis, permissões, versão de cada evento, rollback integral em falha, vinculados bloqueados, impacto no ledger e ressincronização de todas as telas.
12. Cartões formais versus históricos: seleção heterogênea deve recusar ou ser repartida **em prévia** com confirmação separada por domínio; nunca usar um único PATCH genérico para ocultar inconsistência.
13. Concorrência: atualização por outro usuário durante preview, token de revisão, 409 e recarga; não sobrescrever silenciosamente.
14. UI: telas e modais leem as projeções canônicas; nenhum subtotal, parcela, saldo ou status calculado no componente.

## 6. Ordem recomendada da futura Etapa 10 (NÃO iniciada)
1. Após encerrar formalmente a Etapa 09: congelar contratos e matriz de autoridades; implementar mais testes de caracterização de API em banco efêmero.
2. Especificar formulário único de Novo/Editar conforme print oficial e campos condicionais para despesa, receita, cartão, benefício e transferência, respeitando **cada writer**.
3. Escolher modalidade e validação antes de salvar; preservar autocomplete e catálogo, origem do dado e campos históricos.
4. Implementar criação/edição unitária, respostas canônicas e estados de erro, com observabilidade e testes.
5. Implementar camada de **prévia de edição em massa** (seleção, domínio, capacidades e bloqueios, revisões), inicialmente sem escritores visíveis.
6. Somente após contratos e testes, habilitar lote genérico seguro e, separadamente, eventual writer atômico para cartões.
7. Validar visualmente no print oficial e em mobile; CI+integração não equivalem à aprovação visual do usuário.

## 7. Gates atualmente inalterados
- Etapa 09 visualmente validada nos cinco pontos; continua aberta em gates da API, PR #656 Draft; PR técnica #663 Draft, sem merge.
- Render `meg-platform-api` mantém build com `db:prepare:production` e `prisma db push --accept-data-loss`: **não executar deploy** enquanto não corrigido e auditado.
- Android congelado, Home congelada; #661 e #662 não iniciadas.
- Este relatório é uma **auditoria preparatória estática e documental**, não auditoria exaustiva de todas as linhas, nem execução de todos os testes novos listados. Diferenças identificadas são reportadas, não corrigidas por presunção.
