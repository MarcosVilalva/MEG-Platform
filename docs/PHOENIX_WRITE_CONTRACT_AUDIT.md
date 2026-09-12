# Phoenix V15 — Auditoria dos contratos de escrita

Data de referência: 12/09/2026

## Objetivo

Este documento define quais operações da Phoenix V15 já possuem um contrato de backend compatível com as regras financeiras atuais e quais devem permanecer bloqueadas. A interface Phoenix não deve liberar gravação apenas porque o formulário está pronto.

Princípio: **UI nova; regras e persistência confirmadas antes de cada escrita.**

## Resultado executivo

| Operação | Fonte/rota existente | Estado Phoenix | Motivo |
| --- | --- | --- | --- |
| Criar receita/despesa simples | `POST /finance/events` | Preparar, não liberar ainda | Contrato normalizado existe; faltam auditoria financeira e política final de confirmação/idempotência |
| Editar evento simples | `PATCH /finance/events/:id` | Preparar, não liberar ainda | Atualiza apenas o evento selecionado e recompõe ledger; falta trilha financeira consolidada |
| Arquivar evento simples | `DELETE /finance/events/:id` | Bloqueado | Requer ADMIN/MANAGER e deve preservar auditoria/estorno conforme regra de negócio |
| Valor negativo/estorno | `financialAmountValues()` | Compatível para cálculo | Sinal reverso é suportado; estorno definitivo deve manter vínculo/rastreabilidade com o original |
| Transferência entre contas | `type=transfer` aceito em `/finance/events` | **Bloqueado** | O evento possui apenas `accountId` e o ledger cria uma única entrada; não há conta de destino nem par débito/crédito |
| Compra no cartão | `POST /cards/purchases` | Contrato identificado | Fechamento e parcelamento estão definidos; só liberar após proteção de duplicidade/idempotência e auditoria |
| Pagamento de fatura | `POST /cards/:id/statements/:month/pay` | **Bloqueado para ação real** | Gera evento e quita parcelas, mas não aplica a proteção global de saldo monetário antes da baixa |
| Conta a pagar parcelada | `POST /payables` | Contrato parcial | Divide centavos, porém a regra atual de datas não cobre integralmente clamp/fim de semana definido em `BUSINESS_RULES.md` |
| Despesa recorrente | `POST /payables/recurring` | Contrato parcial | Backend usa `endDate` e materializa horizonte; legado usa quantidade mensal e regras próprias. Necessita unificação |
| Baixa de conta a pagar | `POST /payables/:id/payments` | **Bloqueado para ação real** | Valida saldo aberto do título, mas não bloqueia pagamento acima do saldo monetário disponível |
| Crediário | Não há contrato único equivalente à regra V15/legado | **Bloqueado** | Regras de parcela, vencimento, fim de semana e edição precisam de contrato consolidado |
| Editar parcela de cartão/conta a pagar | Não há rota específica equivalente | **Bloqueado** | Regra exige alterar somente a parcela selecionada; contrato atual não oferece edição granular completa |
| Histórico `antes/depois` | `AuditLog` + `AppState.activityLog`, sem contrato financeiro unificado | **Bloqueado** | Não é permitido fabricar before/after na UI |

## 1. Eventos financeiros normalizados

O schema da API aceita os tipos `income`, `expense`, `transfer`, `investment`, `redemption` e `adjustment`; aceita status do ciclo financeiro; deriva competência da data quando necessário; e permite conta, classificação, forma de pagamento e observações.

`createFinancialEvent()` e `updateFinancialEvent()` normalizam o sinal por `financialAmountValues()` e chamam `syncLedger()`. Eventos com status `confirmed`, `paid` ou `reconciled` geram ledger; eventos previstos não geram movimento realizado.

### Valores negativos

O núcleo de sinal já suporta reversão:

- `income`/`redemption`: entrada positiva; valor digitado negativo produz `signedAmount` negativo;
- demais tipos: direção de saída; valor digitado negativo produz `signedAmount` positivo.

Isso permite representar estorno sem apagar o lançamento original. A Phoenix deve, porém, manter referência/auditoria suficiente para explicar qual evento foi revertido antes de liberar estornos reais.

### Lacuna de contrato do frontend

O cliente Web `finance-client.ts` ainda tipa `FinancialEvent.type` e `FinancialEventInput.type` apenas como `income | expense`, embora o backend aceite mais tipos. A Phoenix não deve contornar isso com `any`; o contrato compartilhado deve ser corrigido antes de ativar tipos adicionais.

## 2. Transferência entre contas

Apesar de `transfer` ser aceito pelo schema, o modelo de criação atual recebe somente um `accountId`. `syncLedger()` apaga/recria apenas uma entrada de ledger ligada a essa conta.

Isso não satisfaz a regra de negócio de que transferência entre contas não altera patrimônio líquido. Para liberar Transferência na Phoenix é necessário um contrato atômico contendo, no mínimo:

- conta de origem;
- conta de destino diferente da origem;
- valor positivo maior que zero;
- duas pernas contábeis/financeiras vinculadas à mesma transferência;
- rollback atômico se qualquer perna falhar;
- histórico que permita rastrear o par.

Até esse contrato existir, o segmento Transferência permanece somente como validação visual.

## 3. Cartões de crédito

`POST /cards/purchases` é a fonte normalizada para novas compras de cartão. O backend:

- aceita até 48 parcelas;
- encontra o cartão ativo;
- usa a data da compra e `closingDay` para definir a primeira fatura;
- divide o total em centavos sem perder arredondamento;
- cria todas as parcelas no mesmo registro de compra.

Regra de primeira fatura confirmada pelo backend:

`purchaseDay > closingDay` → primeira fatura no mês seguinte; caso contrário, fatura do mês da compra.

A Phoenix deve usar essa rota para crédito, e **não** criar simultaneamente um `/finance/events`, evitando dupla contabilização.

### Pagamento de fatura

A rota de pagamento de fatura marca parcelas como pagas e cria um `FinancialEvent` de despesa paga. O contrato, entretanto, não consulta a proteção de saldo monetário definida nas regras de negócio. Portanto o botão real de pagamento permanece bloqueado até a proteção existir no servidor ou em um gateway transacional equivalente.

## 4. Parcelamentos e contas a pagar

`POST /payables` divide o valor em parcelas e distribui os centavos. O limite atual é 60 parcelas. A geração mensal usa `Date.setUTCMonth()`.

As regras documentadas do MEG exigem ainda:

- limitar o dia ao último dia de meses menores;
- mover vencimentos de sábado/domingo para segunda-feira;
- manter sufixo `n/total`;
- edição de uma parcela sem recriar as demais.

Antes de usar `/payables` como contrato geral de crediário, essas regras precisam ser consolidadas no backend e testadas.

## 5. Recorrência

Existem dois comportamentos reais hoje:

1. Backend `POST /payables/recurring`: suporta semanal, mensal e anual, com `nextDueDate` e `endDate`; materializa contas a pagar no horizonte.
2. Legado Web `recurring-transactions-core.js`: recorrência mensal por quantidade, normalmente 2–24 ocorrências, com `addMonthsClamped()` e metadados de série.

A Phoenix não deve escolher silenciosamente um deles. O contrato definitivo precisa definir:

- recorrência de despesa, receita e/ou ambos;
- quantidade versus data final;
- regra de meses curtos;
- fim de semana;
- edição de uma ocorrência versus série;
- cancelamento da série sem apagar histórico;
- idempotência da materialização.

Até essa decisão, o drawer pode simular a recorrência, mas não gravá-la.

## 6. Baixa de pendências e proteção de saldo

`POST /payables/:id/payments` valida que o principal não ultrapasse o saldo aberto do título, cria evento financeiro de despesa paga e atualiza o saldo do título.

Isso é necessário, mas ainda insuficiente para a regra MEG: **uma despesa monetária não pode ser paga quando exceder o saldo monetário disponível na data atual**. O bloqueio deve ser garantido na mesma operação de servidor para evitar corrida entre dispositivos.

Consequência: a simulação da Phoenix permanece ativa; a confirmação real continua desabilitada.

## 7. Edição, exclusão e auditoria

`PATCH /finance/events/:id` atualiza somente o evento solicitado e sincroniza seu ledger. `DELETE /finance/events/:id` arquiva e remove o ledger; não apaga fisicamente o evento.

Entretanto, os serviços financeiros normalizados ainda não expõem uma trilha unificada com `antes/depois` equivalente ao que o V15 pretende mostrar. `AppState.activityLog` e `AuditLog` têm finalidades diferentes hoje.

Antes de liberar edição/arquivamento pela Phoenix, o write gateway deve registrar uma ação financeira consultável com:

- usuário;
- data/hora;
- origem/dispositivo quando disponível;
- ID do registro;
- ação;
- snapshot anterior e posterior quando aplicável;
- vínculo de estorno/recuperação quando aplicável.

## 8. Idempotência e confirmação

A camada antiga de AppState possui mecanismos próprios de confirmação de mutação, recibos/idempotência e recuperação. As rotas normalizadas de eventos/cartões/pendências não apresentam, nos contratos auditados, uma chave uniforme de idempotência fornecida pelo cliente.

A Phoenix usa a premissa `lançou → servidor confirmou → UI libera nova ação`. Antes de habilitar gravação em produção, cada operação deve ter uma estratégia explícita para evitar dupla gravação em retry, clique repetido ou conexão instável.

## 9. Ordem segura para liberar escrita

1. Corrigir/centralizar os tipos compartilhados de `FinancialEvent`.
2. Criar o gateway Phoenix de mutação com confirmação e idempotência.
3. Consolidar auditoria financeira consultável.
4. Liberar receita/despesa simples.
5. Validar edição simples e estorno reverso.
6. Liberar compra no cartão pelo domínio de cartões.
7. Implementar proteção transacional de saldo para baixa/fatura.
8. Consolidar parcelamento/crediário e recorrência.
9. Criar contrato atômico de transferência entre contas.
10. Só então liberar arquivamento, ações em lote e demais operações críticas.

## Regra de bloqueio

Enquanto um item estiver marcado como **Bloqueado** ou **Contrato parcial**, a Phoenix pode apresentar a interface para validação, porém não deve enviar mutação para a API.
