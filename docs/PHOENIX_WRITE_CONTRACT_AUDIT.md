# Phoenix V15 — Auditoria dos contratos de escrita

Data de referência: 12/09/2026

## Objetivo

Este documento define quais operações da Phoenix V15 já possuem um contrato de backend compatível com as regras financeiras atuais e quais devem permanecer bloqueadas. A interface Phoenix não deve liberar gravação apenas porque o formulário está pronto.

Princípio: **UI nova; regras e persistência confirmadas antes de cada escrita.**

## Resultado executivo

| Operação | Fonte/rota existente | Estado Phoenix | Motivo |
| --- | --- | --- | --- |
| Criar receita/despesa simples | `POST /finance/events` | Preparar, não liberar ainda | Contrato normalizado existe; faltam auditoria financeira e política uniforme de idempotência |
| Editar evento simples | `PATCH /finance/events/:id` | Preparar, não liberar ainda | Atualiza apenas o evento selecionado e recompõe ledger; falta trilha financeira consolidada |
| Arquivar evento simples | `DELETE /finance/events/:id` | Bloqueado | Requer ADMIN/MANAGER e deve preservar auditoria/estorno conforme regra de negócio |
| Valor negativo/estorno | `financialAmountValues()` | Compatível para cálculo | Sinal reverso é suportado; estorno definitivo deve manter vínculo/rastreabilidade com o original |
| Transferência entre contas | `type=transfer` aceito em `/finance/events` | **Bloqueado** | O evento possui apenas `accountId` e o ledger cria uma única entrada; não há conta de destino nem par débito/crédito |
| Compra no cartão | `POST /cards/purchases` | Contrato identificado | Fechamento e parcelamento estão definidos; só liberar após proteção uniforme de idempotência e auditoria |
| Pagamento de fatura | `POST /cards/:id/statements/:month/pay` | **Bloqueado para ação real** | Ainda precisa receber a mesma proteção transacional de saldo e idempotência já aplicada às contas a pagar |
| Conta a pagar parcelada | `POST /payables` | Contrato consolidado | Divide centavos, limita mês curto e move sábado/domingo para segunda-feira |
| Despesa recorrente | `POST /payables/recurring` | Contrato consolidado no backend | Quantidade, data final e série aberta convergem para uma única metodologia; materialização saiu do GET |
| Baixa de conta a pagar | `POST /payables/:id/payments` | **Backend protegido; Phoenix ainda bloqueada** | Saldo monetário é verificado na mesma transação, com Verocard separado, data efetiva, idempotência e proteção concorrente |
| Crediário | Não há contrato único equivalente à regra V15/legado | **Bloqueado** | Regras específicas de crediário e edição granular ainda precisam de contrato próprio |
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

A rota de pagamento de fatura marca parcelas como pagas e cria um `FinancialEvent` de despesa paga. O contrato ainda precisa reutilizar a proteção monetária transacional e a política de `operationId` implantadas em contas a pagar. Portanto o botão real de pagamento permanece bloqueado.

## 4. Parcelamentos e contas a pagar

`POST /payables` divide o valor em parcelas e distribui os centavos. O limite atual é 60 parcelas.

A geração agora usa calendário canônico:

- preserva o dia-base da primeira parcela;
- limita o dia ao último dia de meses menores;
- move sábado/domingo para segunda-feira;
- mantém sufixo `n/total`;
- não usa mais `Date.setUTCMonth()` para a série.

Exemplo: uma série iniciada em 31/01 preserva a intenção de dia 31 mesmo ao passar por fevereiro.

A edição granular de uma parcela sem recriar as demais continua como contrato separado a ser implementado antes de liberar crediário completo.

## 5. Recorrência

A recorrência fixa foi consolidada no backend. `POST /payables/recurring` aceita:

- frequência semanal, mensal ou anual;
- término por quantidade de ocorrências;
- término por data final;
- série sem data final.

Quantidade é convertida para uma data final determinística. O motor preserva o dia-base em meses curtos (`31/01 → 28/02 → 31/03`, ou 29/02 em ano bissexto).

A leitura de pendências deixou de materializar recorrências. `GET /payables` é leitura pura. A materialização ocorre na criação da série, no startup da API e periodicamente em background, usando a restrição única `recurrenceId + dueDate` para impedir duplicidade.

Conta mensal de valor variável não deve usar recorrência fixa automática; permanece como fluxo de duplicação manual para o próximo mês.

## 6. Baixa de pendências e proteção de saldo

`POST /payables/:id/payments` agora executa o fluxo crítico em transação serializável:

1. rejeita data futura para um pagamento que nasceria como `paid`;
2. valida título aberto, conta ativa e forma de pagamento ativa;
3. soma principal, juros e multa;
4. separa Verocard do caixa monetário;
5. recalcula o saldo monetário na data efetiva da baixa;
6. rejeita a operação inteira quando o disponível for insuficiente;
7. cria `FinancialEvent`, `PayablePayment` e reduz `openAmount` na mesma transação;
8. usa retry de conflito serializável para reduzir risco de duas baixas simultâneas consumirem o mesmo saldo.

Quando bloqueado por saldo, o servidor devolve `INSUFFICIENT_MONETARY_BALANCE` com disponível, solicitado e faltante. Nada é persistido.

### Idempotência

A rota aceita `operationId`. Quando presente, reutiliza `CloudMutationReceipt`, mecanismo já existente no MEG. O mesmo `operationId` com conteúdo diferente é rejeitado, protegendo contra retry, duplo clique e reenvio de conexão.

A Phoenix continua sem chamar a mutação até terminarmos a validação visual e os demais gates de escrita.

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

A camada antiga de AppState possui recibos/idempotência e recuperação. A baixa de pendências agora reutiliza esse mecanismo por `operationId + requestHash`.

O próximo endurecimento é tornar esse padrão uniforme para eventos financeiros, compras de cartão, pagamento de fatura, recebimentos e futuras transferências.

A Phoenix mantém a premissa `lançou → servidor confirmou → UI libera nova ação`.

## 9. Efeitos colaterais em rotas de leitura

`GET /payables` já está puro. A auditoria identificou outro caso a tratar: `GET /cards` ainda pode migrar cartões legados durante a consulta. Essa compatibilidade deve sair do GET e ir para manutenção explícita/background antes do corte definitivo.

## 10. Ordem segura para liberar escrita

1. Aplicar proteção/idempotência equivalentes ao pagamento de fatura.
2. Remover efeitos colaterais restantes de `GET /cards`.
3. Corrigir/centralizar os tipos compartilhados de `FinancialEvent`.
4. Criar gateway Phoenix de mutação com confirmação/idempotência uniforme.
5. Consolidar auditoria financeira consultável.
6. Liberar receita/despesa simples.
7. Validar edição simples e estorno reverso.
8. Liberar compra no cartão pelo domínio de cartões.
9. Liberar baixa de contas a pagar usando o contrato protegido já implementado.
10. Criar contrato atômico de transferência entre contas.
11. Só então liberar arquivamento, ações em lote e demais operações críticas.

## Regra de bloqueio

Enquanto um item estiver marcado como **Bloqueado** ou depender de proteção ainda não uniforme, a Phoenix pode apresentar a interface para validação, porém não deve enviar mutação para a API.
