# Phoenix V15 — Endurecimento do domínio financeiro

Data de referência: 12/09/2026

## Decisões implementadas nesta etapa

### 1. Baixa de contas a pagar protegida no servidor

A baixa monetária passa a ser autorizada pelo backend, dentro da mesma transação que cria o `FinancialEvent`, grava `PayablePayment` e reduz `openAmount`.

Regras:

- saldo é recalculado na data efetiva informada para o pagamento;
- Verocard permanece fora da proteção monetária;
- juros e multa entram no valor efetivamente desembolsado;
- pagamento futuro não pode nascer diretamente com status pago;
- conta e forma de pagamento informadas precisam estar ativas;
- principal não pode superar o saldo aberto do título;
- se o saldo monetário for insuficiente, nada da baixa é persistido;
- a resposta de bloqueio informa disponível, solicitado e faltante.

A execução usa isolamento serializável com retry de conflito para reduzir risco de duas baixas concorrentes consumirem o mesmo saldo.

### 2. Idempotência da baixa

`POST /payables/:id/payments` aceita `operationId` opcional. Quando informado, a operação reutiliza `CloudMutationReceipt`, mecanismo já existente no MEG, para impedir gravação duplicada em retry/reenvio.

O mesmo `operationId` com conteúdo diferente é rejeitado.

### 3. Recorrência canônica

Foram consolidados três conceitos diferentes:

- parcelamento: série fechada de parcelas;
- recorrência fixa: template com frequência e término opcional;
- conta variável: deve continuar usando duplicação manual para o próximo período, não recorrência automática do mesmo valor.

A recorrência fixa aceita:

- semanal, mensal ou anual;
- término por quantidade de ocorrências;
- término por data final;
- série sem data final.

Quantidade de ocorrências é convertida para uma data final determinística. Não foi necessário adicionar uma terceira estrutura de persistência.

### 4. Calendário de meses curtos

O calendário canônico preserva o dia-base da série. Exemplo:

`31/01 → 28/02 → 31/03`

Em ano bissexto:

`31/01 → 29/02 → 31/03`

Parcelas mensais também deixaram de depender de `Date.setUTCMonth()`, que podia saltar meses em datas como dia 31.

Para parcelamentos, sábado e domingo são movidos para a segunda-feira seguinte, conforme a regra de negócio já documentada.

### 5. GET sem efeito colateral em pendências

`GET /payables` agora é leitura pura. Abrir Pendentes não cria contas, não avança templates e não modifica a base.

A materialização de recorrências ocorre:

- no momento da criação da série;
- no startup da API;
- periodicamente em background.

A rotina é idempotente porque `Payable` já possui unicidade por `recurrenceId + dueDate`.

## Próximos endurecimentos recomendados antes de liberar escrita Phoenix

### A. Aplicar a mesma proteção ao pagamento de fatura

`POST /cards/:id/statements/:month/pay` também produz saída monetária. Deve usar a mesma regra transacional de saldo e idempotência antes de o botão real ser liberado.

### B. Centralizar auditoria financeira normalizada

Criar/editar/arquivar evento, pagar conta, pagar fatura, receber título, criar recorrência e demais mutações críticas devem registrar uma trilha consultável com usuário, ação, registro, horário e snapshots relevantes.

A Phoenix não deve depender de uma auditoria montada apenas no frontend.

### C. Idempotência uniforme para todas as mutações críticas

O padrão de `operationId + requestHash + receipt` deve virar contrato comum para:

- eventos financeiros;
- compras de cartão;
- pagamento de fatura;
- recebimentos;
- recorrências;
- transferências futuras.

### D. Remover os efeitos colaterais restantes em GET

A consulta de cartões ainda contém compatibilidade que pode migrar cartões legados durante leitura. Essa migração deve ser deslocada para rotina explícita/background antes do corte definitivo da Phoenix.

### E. Transferência atômica de duas pernas

Transferência continua bloqueada até existir um contrato contendo origem, destino, vínculo único e duas pernas de ledger dentro da mesma transação. Uma transferência não pode alterar patrimônio líquido.

### F. Escopo financeiro por workspace

O projeto já possui workspaces, mas parte dos domínios normalizados ainda consulta por `userId`. Antes de expandir uso familiar/multiusuário, deve ser decidido de forma definitiva se o patrimônio pertence ao usuário ou ao workspace e aplicar essa regra de forma uniforme.

### G. Relógio financeiro único

Datas de pagamento, vencimento, materialização, notificações e regras de “hoje” devem usar explicitamente `America/Sao_Paulo`, evitando divergência entre navegador, Render e banco.

### H. Paridade numérica antes de escrita

Antes de liberar o primeiro `Salvar` da Phoenix, os cenários de referência do sistema devem ser comparados contra a produção atual, incluindo saldo monetário, Verocard, pendências, faturas, recorrências e parcelas.

## Gate de liberação

A escrita da Phoenix continua bloqueada enquanto qualquer fluxo crítico depender apenas de proteção de frontend ou possuir duas metodologias concorrentes no backend.
