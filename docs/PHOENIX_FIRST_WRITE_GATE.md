# Phoenix V15 — Gate do primeiro fluxo de escrita

Data de referência: 13/09/2026

## Objetivo

Consolidar o estado real necessário para liberar o primeiro `Salvar` financeiro da Phoenix sem confundir UI pronta com backend pronto.

Regra central: **a Phoenix permanece read-only até que o caminho completo navegador → proxy do preview → API → banco esteja protegido, testado e explicitamente liberado.**

Nenhuma conclusão deste documento autoriza merge da PR #243 em `main`.

## Estado confirmado nesta auditoria

### Frontend de Lançamentos

`PhoenixMovementsV15` já possui o formulário V15, validação de campos, máscara monetária, classificação/grupo, formas de pagamento, cartões, recorrência, transferência, detecção visual de possível duplicidade e resumo antes da confirmação.

O formulário continua corretamente sem gravação real:

- mostra `Gravação ainda bloqueada`;
- o botão é `Revisar lançamento · sem gravar`;
- a revisão não envia mutação à API.

A tela deve continuar assim até o gate deste documento ser atendido.

### Cliente Web

`finance-client.ts` já expõe `createEvent()` com `operationId` opcional e o tipo compartilhado de `FinancialEvent` já aceita `income`, `expense`, `transfer`, `investment`, `redemption` e `adjustment`.

Portanto, a lacuna antiga de tipagem restrita a receita/despesa não é mais atual.

### Backend na branch Phoenix

A branch `phoenix/v15-clean-room` já contém o gateway protegido `createFinancialEventProtected()` para novos eventos simples. O fluxo atual da branch:

- executa em transação serializável;
- resolve o workspace mesmo quando não há `operationId`;
- aceita `operationId` e calcula `requestHash`;
- reutiliza `CloudMutationReceipt` em retry idêntico;
- rejeita reutilização do mesmo `operationId` com conteúdo diferente;
- valida conta, categoria e forma de pagamento ativas no escopo do usuário;
- usa a política canônica de sinal `financialAmountValues()`;
- grava `workspaceId` no novo evento;
- cria ledger para status efetivados;
- registra auditoria financeira estrutural `FINANCIAL_EVENT_CREATED`;
- impede que transferência use o contrato simples de uma única perna.

O contrato automatizado `event-mutation.contract.test.ts` protege esses requisitos no CI.

### Transferência

O estado documental anterior ficou desatualizado. A branch Phoenix já possui `POST /finance/transfers` e `createFinancialTransfer()` com:

- origem e destino distintos;
- duas pernas financeiras;
- transação serializável;
- `operationId` obrigatório;
- proteção contra replay divergente;
- validação de contas monetárias ativas;
- verificação do saldo da origem;
- auditoria financeira;
- recibo de idempotência.

Isso torna o backend de transferência tecnicamente muito mais avançado, mas **não autoriza sua liberação na UI nesta primeira etapa**.

### Auditoria financeira

A branch Phoenix possui `recordFinancialAudit()` e `GET /finance/audit`, com `schemaVersion`, `before`, `after`, contexto, ator, entidade, ação e escopo por workspace.

A auditoria já cobre eventos, transferências, contas a pagar, recorrências, cartões e recebíveis nos contratos atuais da branch.

### Cartões

O domínio de cartões da branch também já avançou além dos documentos antigos:

- compra protegida por transação serializável e `operationId`;
- pagamento de fatura protegido por saldo monetário, idempotência e auditoria;
- `GET /cards` não materializa migração legada durante a leitura; a migração foi deslocada para rotina explícita de manutenção.

Mesmo assim, compra no cartão deve continuar usando `/cards/purchases`; nunca deve ser duplicada com `/finance/events`.

## Bloqueador arquitetural atual

O preview Phoenix não usa a API da própria branch. O proxy `phoenix-preview-server.mjs` aponta para:

`https://meg-platform-api.onrender.com`

Essa API Render está vinculada a `main`.

No estado atual de `main`:

- `POST /finance/events` ainda chama o serviço legado `createFinancialEvent()`;
- não existe `event-mutation.ts` em `main`;
- o `POST /finance/events` de produção não possui o gateway novo de idempotência/auditoria da branch Phoenix;
- algumas leituras de catálogos em `main` ainda não possuem o mesmo escopo por usuário aplicado na branch Phoenix.

Portanto, **não é seguro simplesmente liberar POST no proxy do preview ou trocar o botão da UI para Salvar**.

## Proteção adicional do preview

O servidor `phoenix-preview-server.mjs` bloqueia deliberadamente mutações financeiras. POST é permitido apenas para o ciclo de autenticação; demais mutações recebem `PREVIEW_READ_ONLY`.

Essa barreira deve permanecer enquanto a API principal não possuir o mesmo hardening exigido pela Phoenix.

Quando chegar o momento de liberar escrita, o proxy não deve virar um proxy de escrita genérico. A liberação deve ser estreita, por capacidade, começando somente pelo endpoint explicitamente homologado.

## Auditoria dos PaymentMethods para Receita

A consulta direta da base normalizada em 13/09/2026 encontrou os seguintes métodos ativos:

- BOLETO;
- CARTÃO AZUL;
- CARTÃO BB;
- CARTÃO BV;
- CARTÃO DÉBITO;
- CARTÃO ITAÚ;
- CARTÃO KABUM;
- CARTÃO MAGALU;
- CARTÃO ML;
- CARTÃO NUBANK;
- CARTÃO RIACHUELO;
- DÉBITO AUTOMÁTICO;
- PIX;
- RIACHUELO;
- VEROCARD.

Resultado do gate de Receita:

- **PIX** já existe na base normalizada e está ativo;
- **DINHEIRO** existe no catálogo legado do AppState, mas não está materializado na tabela normalizada `PaymentMethod`;
- **DEPÓSITO BANCÁRIO** não foi encontrado nem no catálogo normalizado ativo nem no catálogo legado consultado.

Logo, a regra desejada `Receita = Pix / Dinheiro / Depósito bancário` ainda não pode ser aplicada apenas filtrando os `PaymentMethods` normalizados atuais.

Não inserir esses cadastros silenciosamente na produção. A normalização de `DINHEIRO` e a criação/validação de `DEPÓSITO BANCÁRIO` devem ser tratadas como mudança de catálogo controlada.

## Comportamento observado das Receitas existentes

Na base normalizada atual, receitas ativas observadas usam predominantemente status `paid`.

Amostra de formas de recebimento em eventos de receita:

- maioria histórica sem forma normalizada informada;
- PIX já possui uso relevante;
- VEROCARD aparece em receitas de benefício e permanece fora do caixa monetário;
- há registro legado/normalizado associado a DINHEIRO.

Isso sustenta a regra de produto já definida de apresentar Receita realizada como `Recebido`, mas o primeiro fluxo de escrita ainda deve distinguir data atual/passada de data futura.

## Escopo permitido para o primeiro writer

O primeiro writer da Phoenix deve ser deliberadamente menor que o formulário visual completo.

### Pode entrar na Fase 1

**Receita simples monetária**

- tipo `income`;
- conta monetária ativa;
- valor não nulo;
- descrição;
- data;
- forma de recebimento normalizada e permitida;
- classificação opcional;
- `operationId` estável durante retries;
- data atual/passada pode nascer efetivada conforme a regra homologada;
- data futura deve permanecer prevista e nunca nascer como realizada.

**Despesa simples fora de cartão/crediário/recorrência**

- tipo `expense`;
- conta ativa adequada;
- classificação + grupo real (`categoryId` é autoridade);
- forma de pagamento ativa;
- descrição, data e valor;
- `operationId` estável;
- situação inicial explicitamente definida pelo fluxo, sem inferir pagamento de uma despesa futura.

### Continua fora da Fase 1

- cartão de crédito: usar domínio `/cards/purchases` em lote posterior;
- crediário: permanece sem contrato V15 único suficiente;
- recorrência: usar domínio de `payables/recurring`, não duplicar em evento simples;
- transferência: usar `/finance/transfers` em lote próprio posterior;
- estorno negativo: apesar do sinal canônico suportar reversão, liberar apenas quando o vínculo/rastreabilidade com o original estiver definido na UX;
- edição e arquivamento: lote posterior;
- ações em lote: lote posterior;
- `Salvar como modelo`: não tratar como persistência financeira enquanto não houver contrato oficial.

## Contrato UX obrigatório do primeiro Salvar

O fluxo deve obedecer ao conceito MEG:

`lançou → gravou → servidor confirmou → UI atualizou`

Requisitos:

1. gerar um `operationId` antes do primeiro envio e manter o mesmo ID em qualquer retry do mesmo comando;
2. bloquear o botão enquanto a requisição estiver em andamento;
3. impedir segundo envio por clique repetido;
4. não fechar/resetar o formulário antes da confirmação do servidor;
5. tratar replay idempotente como sucesso do mesmo comando, não como novo lançamento;
6. após sucesso, forçar atualização do snapshot financeiro real;
7. só exibir `Salvo/Sincronizado` depois que a resposta do servidor for válida;
8. em falha, manter os dados preenchidos e permitir retry seguro;
9. nunca simular sucesso local quando a API falhar;
10. registrar mensagem compreensível para erros de catálogo inativo, conflito de `operationId` e demais erros de domínio.

## Arquitetura proposta para liberação

### Etapa A — backend isolado antes da UI

Preparar uma PR/hotfix pequena baseada em `main`, contendo apenas o hardening estritamente necessário ao primeiro writer:

- gateway protegido de criação de evento simples;
- auditoria financeira necessária;
- validação de referências ativas e escopo por usuário;
- transação serializável;
- `operationId + requestHash + CloudMutationReceipt`;
- testes contratuais do fluxo;
- correção do escopo dos catálogos lidos pelo formulário, quando aplicável.

Essa PR deve permanecer draft até revisão. Não incluir o corte completo da Phoenix nem mudanças visuais.

### Etapa B — catálogo de Receita

Resolver de forma controlada os equivalentes normalizados de:

- PIX;
- DINHEIRO;
- DEPÓSITO BANCÁRIO.

A UI de Receita deve mostrar somente métodos homologados após essa etapa.

### Etapa C — writer frontend ainda protegido por capacidade

Criar uma camada de mutação Phoenix que:

- encapsule `operationId`;
- exponha estado `idle / saving / confirmed / error`;
- aplique o roteamento correto por domínio;
- recuse modalidades ainda não liberadas;
- faça refresh atômico do read model após sucesso.

### Etapa D — liberação estreita no proxy

Somente depois do backend homologado/deployado, permitir no preview a mutação exata necessária ao primeiro fluxo.

Não liberar POST genérico para `/finance/*`.

### Etapa E — teste controlado

Executar primeiro um lançamento real de baixo impacto, confirmar:

- apenas um registro criado;
- auditoria criada;
- recibo de idempotência criado;
- ledger correto quando aplicável;
- Home, Lançamentos, Histórico e saldos atualizados;
- retry do mesmo `operationId` não duplica;
- reload do navegador mantém o estado confirmado.

Só depois ampliar o writer.

## Gate objetivo antes de trocar `Revisar lançamento` por `Salvar`

O botão real só pode ser ativado quando todos os itens abaixo estiverem verdes:

- [x] formulário V15 validado visualmente;
- [x] política de sinal monetário consolidada;
- [x] gateway protegido existe na branch Phoenix;
- [x] idempotência de criação possui contrato automatizado na branch Phoenix;
- [x] auditoria financeira estrutural existe na branch Phoenix;
- [x] validação de catálogos ativos existe na branch Phoenix;
- [ ] hardening equivalente publicado na API realmente usada pelo preview;
- [ ] PaymentMethods de Receita normalizados/homologados;
- [ ] writer frontend com estado de confirmação e retry seguro;
- [ ] allowlist estreita de escrita no proxy do preview;
- [ ] teste real controlado aprovado;
- [ ] paridade pós-gravação conferida em Home/Lançamentos/Histórico.

Enquanto existir qualquer item pendente acima, a Phoenix continua read-only.

## Estado de continuidade desta etapa

- os 36 avatares da base enviada foram validados pelo usuário;
- a PR #243 continua draft e sem merge;
- nenhuma escrita financeira foi habilitada nesta auditoria;
- o próximo trabalho seguro é preparar o hotfix isolado de backend baseado em `main`, sem mesclar automaticamente, e fechar o catálogo de Receita antes de conectar o primeiro `Salvar`.