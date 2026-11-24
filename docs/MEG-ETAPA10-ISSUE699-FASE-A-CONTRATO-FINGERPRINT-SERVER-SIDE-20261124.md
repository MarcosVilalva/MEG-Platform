# MEG Finanças | Etapa 10 | Issue #699 | Fase A
## Contrato de compatibilidade server-side por fingerprint temporal: parecer de viabilidade e proposta condicionada

**Data:** 24/11/2026  
**Estado:** PROPOSTA DOCUMENTAL, NÃO IMPLEMENTADA E NÃO HOMOLOGADA.  
**Repositório:** MarcosVilalva/MEG-Platform  
**Branch:** stage10/p0-public-review-20261123, PR #705 Draft.  
**Issue:** #699 OPEN/P0.  
**Escopo imediato:** comportamento de criação em POST /finance/events para as APKs 706/707/708, sem modificar nenhum cliente legado, writer, regra financeira, schema produtivo ou API em produção. O escopo da Issue #699 também contém fluxos de PATCH/PUT legado; este documento NÃO os declara resolvidos.

### 1. Evidências verificadas e limites

1. No fluxo original da APK 708 via CapacitorHttp nativo, HTTP 409/422 preservam o formulário e permitem retry manual. O retry utiliza outro operationId. Depois de uma resposta retida, a UI ainda estava processando aos 47 s e exibiu falha, com Salvar habilitado, na inspeção após aproximadamente 126 s. O quarto POST voltou com operationId diferente. Evidência: GitHub Actions #45444361896 e #45452026542, ambos SUCCESS.
2. O POST nativo possui Content-Type application/json, esquema Authorization Bearer e não envia Origin; o fallback analisado enviava Origin: https://localhost. A resposta de aproximadamente 51 s foi aceita como sucesso no transporte nativo, apesar de AbortSignal.timeout(45e3) no JS. O instante exato do timeout nativo não foi determinado.
3. Cold start via force-stop, novo PID e login fictício na APK original: nenhum POST espontâneo adicional nos intervalos observados antes e após reautenticar. Nenhum journal de intenção foi encontrado no localStorage ou no IndexedDB observado. Evidência: Actions #45450373014 e #45451835980.
4. APKs 706/707: inventário estático mostra CapacitorHttp habilitado, native-bridge.js idêntico e rota /finance/events presente. Isso NÃO equivale a caracterização dinâmica destas versões, nem informa a base instalada ativa.
5. O marcador syntheticCommitted do mock de rede é apenas um commit fictício no servidor de teste, **não** uma gravação PostgreSQL 17 demonstrada por esse ensaio de Android. A garantia de transação financeira deve ser provada separadamente nos gates Fastify/JWT/PG17.
6. No candidato da API, createFinancialEventProtected já utiliza CloudMutationReceipt por (workspaceId, operationId), hash do pedido, transação serializável, FinancialEvent, LedgerEntry e AuditLog no mesmo fluxo. Mesmo operationId com o mesmo pedido retorna o recibo; reutilização divergente rejeita. A rota POST /finance/events hoje responde HTTP **201** quando a criação tem sucesso, não apenas 200.
7. A API também possui **SEMANTIC_DUPLICATE_WINDOW_MS = 10 minutos**: findRecentFinancialEventDuplicate compara contexto, descrição, tipo, status, data, valor e IDs; sem allowDuplicate, a coincidência gera POSSIBLE_DUPLICATE/HTTP 409. Esse bloqueio já existe e não equivale a prova de retry.

Referências: docs/MEG-ETAPA10-ISSUE699-CAPACITORHTTP-NATIVO-COLDSTART-20261124.md; docs/MEG-ETAPA10-ISSUE699-FASE-A-CONTRATO-COMPATIBILIDADE-20261124.md; apps/api/src/modules/finance/event-mutation.ts; apps/api/src/modules/finance/monetary-protection.ts; apps/api/src/modules/finance/routes.ts; apps/api/src/modules/app-state/mutation-receipt.ts; docs/MEG-WEB-FINANCIAL-AUTHORITY.md.

### 2. Invariantes exigidas (critérios não negociáveis)

- I1. Nenhuma alteração em APK 706/707/708. Não exigir novo header, endpoint, confirmação, journal, operação estável ou tratamento novo da UI.
- I2. Preservar a semântica de sucesso/falha já suportada. O POST atual responde 201 em criação confirmada, recebido pela APK como sucesso; não inventar um novo HTTP ou um 200 pendente.
- I3. **Toda resposta 2xx de sucesso financeiro precisa corresponder a um FinancialEvent já persistido, efetivo e autorizado, corretamente relacionado à intenção daquela requisição.** Um registro semelhante prévio não basta para afirmar essa identidade.
- I4. Uma nova despesa legítima, ainda que totalmente idêntica à anterior, não pode ser descartada, suprimida ou bloqueada automaticamente por mera semelhança temporal.
- I5. Uma tentativa identificada como replay **da mesma intenção** não pode criar segundo FinancialEvent, LedgerEntry ou efeito financeiro; a tentativa suprimida precisa de trilha auditável.
- I6. O estado autoritativo é o servidor: ID real do evento, sua situação vigente, recibo de mutação, transação e vínculos. Resposta perdida não desfaz commit, e o servidor não deve presumir que ACK de rede foi consumido.
- I7. Isolamento estrito por workspace, usuário autorizado e domínio monetário. Não mover benefício, cartão, transferência ou PUT/PATCH do AppState para o writer de despesas.
- I8. Nunca reintroduzir lançamento arquivado, exceder saldo, criar ledger a mais, violar vínculos, nem esconder uma rejeição financeira verdadeira.

### 3. Limite formal: por que fingerprint + tempo NÃO demonstram identidade

Considere duas histórias, com o mesmo estado de banco antes da segunda chamada e exatamente os mesmos dois HTTP POSTs: mesmo workspace/usuário autenticado, mesmo valor, data, descrição, conta, categoria, método, status, notas, horário de chegada e operationIds A e B diferentes.

- **História R:** A criou o evento e houve perda da resposta. B é retry da mesma despesa. Decisão exigida: suprimir B e retornar a confirmação de A.
- **História N:** A criou o evento. O usuário realizou outra despesa legítima idêntica. B é a nova intenção. Decisão exigida: criar B, não suprimir e não devolver o evento A como se fosse B.

O servidor pode saber que A foi gravada; isso **não revela** se B é R ou N. Até um sinal de socket fechado antes do ACK apenas demonstra entrega incerta, não a intenção do segundo POST. Um fingerprint completo e uma janela de poucos segundos não alteram esta indistinguibilidade.

**Conclusão lógica:** as invariantes I3, I4 e I5 não podem ser garantidas simultaneamente para B com novo operationId e sem outra evidência causal. A supressão automática indiscriminada por fingerprint + janela viola I3/I4; criar sempre B viola I5 na história R; reter B e responder falha genérica bloqueia temporariamente N, violando I4. Registrar B em uma fila pendente evita descarte silencioso, mas ainda NÃO cumpre a proibição de bloqueio automático.

Este limite já está reconhecido no documento de Fase A existente; ele não deve ser sobrescrito por uma confiança probabilística apresentada como garantia.

### 4. Contrato server-side proposto, como detector e guarda condicionada

**4.1. Fingerprint contextual de suspeita (não identidade)**

Calcular no servidor, depois de autenticar e aplicar as regras canônicas, um hash de versão explícita (por exemplo fp-v1) de uma representação determinística de:

- workspaceId e autoridade do proprietário da despesa, ator autenticado, endpoint e tipo do domínio;
- tipo, status solicitado, status resolvido, data e competência;
- valor exato no mesmo padrão monetário canônico do writer (centavos ou Decimal sem ponto flutuante de apresentação), sinal contábil;
- IDs de conta, categoria e forma de pagamento, com null/ausente tratados conforme a semântica já validada;
- descrição e observações sob normalização **idêntica à do writer**, sem aproximar textos diferentes.

Excluir apenas a identidade aleatória operationId do fingerprint de conteúdo. Não usar IP, User-Agent, Origin, timezone do aparelho ou ausência de Origin como identidade; podem ser metadados de auditoria de baixa confiança. Não juntar PAYABLE, benefício Verocard, cartão ou transferências nesse índice.

**4.2. Janela temporal**

O prazo atual de 10 minutos da API pode ser adotado inicialmente **apenas para pesquisar candidatos**. Calcular em tempo do banco/servidor a partir do commit/criação de A, nunca da data financeira informada pelo cliente. A escolha/ajuste do prazo exige ensaio; não deve virar restrição UNIQUE por (fingerprint, intervalo), pois isso impediria despesas legítimas idênticas.

**4.3. Registro auditável (esquema ainda NÃO autorizado)**

Desenho conceitual de um log append-only de tentativas, a ser detalhado antes de migration aditiva: attemptId interno, workspaceId, actorId, incomingOperationId, fingerprintVersion, fingerprintHash, serverReceivedAt, predecessorEventId e predecessorOperationId opcionais, evidenceType, outcome, eventId efetivo quando aplicável, requestHash e correlação de recibo. Não persistir JWT, senhas ou corpo integral sem política LGPD.

Outcomes conceituais: NEW_CREATED, VERIFIED_ID_REPLAY, FINGERPRINT_SUSPECTED, VERIFIED_SUPPRESSED, DISTINCT_INTENT_CREATED, REJECTED_INVALID. A auditoria da tentativa suprimida deve ser atômica com a decisão de não criar novo evento; a auditoria de uma tentativa ambígua não pode ser confundida com segunda mutação efetivamente suprimida. Persistir o vínculo com A sem alterar A.

**4.4. Máquina de decisão e HTTP compatível**

| Estado após checagem de escopo, recibo e fingerprint | Ação permitida | Resposta à APK |
| --- | --- | --- |
| Novo pedido, sem predecessor confirmado | Validar regras, gravar FinancialEvent + LedgerEntry aplicável + receipt + auditoria em transação serializável | 201 com objeto canônico **após commit** |
| Mesmo operationId + mesmo requestHash e recibo íntegro | NÃO gravar outro FinancialEvent; auditar replay, reutilizar resposta efetiva correspondente à MESMA intenção | Mesmo sucesso 2xx compatível, sem pending |
| Mesmo operationId + payload divergente | Recusar; nenhuma escrita financeira | Erro existente compatível, ex. 409, e auditoria |
| Novo operationId + mesmo fingerprint dentro da janela, sem prova causal adicional | Marcar **FINGERPRINT_SUSPECTED** e conservar referência A; NÃO tratar B automaticamente como replay confirmado | **Indeterminado:** nenhuma resposta única cumpre I3/I4/I5 sem escolha de política |
| Novo operationId + vínculo causal independente e verificável com a mesma intenção, se existir | Suprimir B em transação atômica, registrar VERIFIED_SUPPRESSED e ligar B ao evento autoritativo A | Sucesso 2xx com objeto REAL de A, somente após verificar identidade e estado efetivo |
| Nova intenção explicitamente distinguida e autorizada | Gravar B apesar da coincidência e auditar a decisão | 201 com evento B real, sem supressão |

**Nota sobre vínculo causal:** por exemplo, mesmo identificador de intenção durável ou referência transacional imutável assinada por fonte confiável. **Não está identificado tal vínculo nas APKs 706/707/708 para retries com novos IDs.** Cabeçalho, mesmo fingerprint, mesmo ator, ACK incerto e janela curta são indícios, não prova.

O contrato NUNCA retorna 200 { pending: true }; 201 somente após criar ou retornar evento já confirmado e vinculado à mesma intenção. O frontend legado foi caracterizado aceitando 201 de sucesso no fluxo original; testar a resposta exata em emulador, sem inventar protocolo.

### 5. Três políticas possíveis para a situação indeterminada

Não há política que satisfaça todos os requisitos em simultâneo; a escolha exige decisão explícita de produto/risco.

| Política | Comportamento em B ambíguo | O que preserva | O que NÃO garante |
| --- | --- | --- | --- |
| P1: criar e marcar suspeita | Cria B com receipt e auditoria de possível duplicata | Não perde nem bloqueia segunda despesa legítima | Pode duplicar FinancialEvent na história R |
| P2: reter B para reconciliação externa | Não cria B imediatamente; conserva tentativa auditável sem 2xx e exige resolução confiável | Evita segunda gravação até resolver | Bloqueia temporariamente intenção legítima; UI legada mostra erro genérico |
| P3: suprimir automaticamente por fingerprint temporal | Retorna o evento A com sucesso e audita B | Evita segundo evento na história R | **Falso sucesso e perda de despesa legítima** na história N: proibido |

**Decisão técnica recomendada:** não habilitar P3 como contrato definitivo. P1 e P2 são alternativas de contenção de risco, não uma implementação que satisfaz integralmente as cinco restrições. Manter a guarda existente sob observação até decisão de risco e prova de UX compatível; não alterar sua semântica de forma silenciosa.

### 6. Transação, concorrência, recibos e auditoria

O desenho futuro do caminho VERIFIED_SUPPRESSED (caso alguma identidade causal seja comprovada) exigirá:

1. Autenticar JWT e resolver workspace/owner/role antes de buscar candidato; rejeitar contexto divergente.
2. Verificar recibo por (workspaceId, operationId) antes de qualquer fingerprint. Se o recibo pertence a outra requisição, não interpretar como replay.
3. Validar fingerprint contextual versionado; recuperar evento/receipt autoritativo A e **sua situação atual**, incluindo arquivamento/estorno, antes de qualquer resposta de sucesso. Não prometer evento ativo com referência já arquivada.
4. Serializar decisões concorrentes para o mesmo contexto sem criar UNIQUE no fingerprint (pode usar bloqueio transacional por chave de fingerprint para consulta, mas nunca como prova de duplicidade).
5. Gravar recibo/alias para B e audit log de supressão na mesma transação em que se comprova que NÃO há novo evento/ledger. Crash ou rollback não podem deixar sucesso sem recibo nem receipt sem evento.
6. Em caso de resposta perdida depois do commit, replay da **identidade comprovada** deve retornar o mesmo evento, com estado consistente; a ausência futura do recibo após expurgo não deve liberar reutilização silenciosa de operação.
7. Retenção, RLS, índice de busca, LGPD, política de tombstones e limpeza de recibos são decisões explícitas separadas. O prazo expiresAt existente não é prova de expurgo automático.

O fluxo atual de CloudMutationReceipt por operationId e a função serializableFinancialTransaction devem ser preservados, não substituídos por uma deduplicação probabilística.

### 7. Matriz de testes obrigatórios antes de qualquer alteração em writer

Ambiente de ponta a ponta exclusivamente **Fastify HTTP real + JWT autenticado + PostgreSQL 17 descartável**. Preparar usuário, workspace, contas, categorias, métodos e saldos fictícios. Aplicar migrations somente no banco descartável, nunca em Supabase/Render/QA persistente. Limpar recursos no fim e registrar hashes/contagens sem segredos.

| Gate | Ensaio | Assert e evidência exigida |
| --- | --- | --- |
| A01 | POST original normal com operationId X | 201; 1 FinancialEvent, 1 LedgerEntry se pago e monetário, 1 receipt, auditoria de criação |
| A02 | Commit PG17 de X, simular perda de ACK e reenviar **mesmo X** | Resposta do evento A, 1 FinancialEvent e 1 ledger, 0 efeito adicional, recibo estável |
| A03 | Mesmo X com payload divergente | 409 existente, nenhuma mudança financeira, auditoria de rejeição |
| A04 | Commit PG17 de X, perda de ACK, retry legado com Y diferente e **payload idêntico** | Registrar que Y é fingerprint-candidato. Demonstrar que NÃO existe prova causal suficiente para suprimir sem risco de perda; gate de garantia dupla deve ficar BLOQUEADO |
| A05 | Duas despesas legítimas intencionalmente idênticas, X/Y na janela | Duas operações reais permitidas, duas trilhas, saldos/ledger adequados; nunca suprimir, retornar A falsamente ou bloquear só pelo fingerprint |
| A06 | Caso comparativo A04 versus A05 com observações de servidor equivalentes | Prova de indistinguibilidade; qualquer política que entregue contagens distintas sem sinal independente é inválida |
| A07 | Candidato com data igual, valor igual, mas conta/categoria/método/status/competência/nota diferentes | Fingerprints distintos; nenhum vínculo falso; precisão monetária exata |
| A08 | Mesmo hash/fingerprint entre workspaces/usuários distintos | 0 vazamento; tokens e visibilidade isolados; nenhuma supressão cruzada |
| A09 | Alta concorrência, 2–20 POSTs de mesmo X, resposta perdida e retry | Exatamente um evento e recibo para X; retries serializáveis; nenhum ledger duplicado |
| A10 | Alta concorrência, IDs diferentes e mesmo conteúdo (intenções distintas comprovadas no harness) | Sem UNIQUE no fingerprint; preservação de todas as intenções legítimas |
| A11 | Se existir vínculo causal VERIFICADO, retry Y com A previamente confirmado | 1 evento/ledger no total, alias/receipt de Y e auditoria SUPPRESSED, resposta 2xx com ID real de A |
| A12 | Forçar falha em cada ponto: evento, ledger, auditoria, recibo e alias | Rollback atômico; jamais receipt sem efeito válido ou 2xx antes do commit |
| A13 | Evento predecessor arquivado/estornado/modificado, retry com mesmo ou novo ID | Não ressuscitar, não devolver confirmação semanticamente falsa; preservar identidade/FKs |
| A14 | Expiração ou exclusão simulada de recibo em PG17 fictício | Não permitir reaproveitar ID antigo como nova escrita sem marcador/tombstone; registrar risco de retenção |
| A15 | 409, 422, timeout após commit, reconexão, falha genérica, 201 de evento confirmado | APK708 original, proxy nativo com egress bloqueado; sem novo código/status/payload; observar UI e ID; no máximo os gates novos estritamente necessários |
| A16 | APKs 706/707 originais, quando viável | Exercitar runtime de 409/422, retry, cold start e confirmações; inventário estático NÃO substitui esses gates |
| A17 | Benefício Verocard, cartão, parcelamento, transferência, pendentes, PATCH/PUT, RLS, LGPD, histórico e rollback | Gates de não regressão isolados por domínio, sem alterar escritores fora do escopo |
| A18 | Detecção por fingerprint com duas despesas legítimas e 409 POSSIBLE_DUPLICATE atual | Demonstrar o bloqueio já existente e provar que uma mudança de política não o agrava nem cria falso sucesso |

**Critério de aprovação da proteção perfeita:** A04 e A05 teriam de passar simultaneamente sem sinal causal adicional. Como o mesmo par de chamadas pode representar R ou N, esse gate é **INATINGÍVEL** com os dados de 706/707/708 conhecidos. Não declarar PASS por escolher apenas cenários que favoreçam a heurística.

Para ensaios que vierem a ser implementados, registrar no mesmo checkpoint: commit, comando, runId, banco/namespace fictício, JWT sem valor exposto, contagem before/after de FinancialEvent/LedgerEntry/Receipt/AuditLog, saldos, chaves de operação e limpeza. Preservar gates PT63–PT217; não repetir homologações aprovadas sem motivo.

### 8. Critérios de decisão e limites da Fase A

**Aprovável agora:** contrato documental, fingerprint como detector de candidato, auditoria de ambiguidade, uso autoritativo de recibos/FinancialEvent e plano de testes. Nenhuma migração ou alteração de writer está autorizada nesta entrega.

**Não aprovável como definitivo:** suprimir B apenas porque A tem mesmo fingerprint dentro de uma janela, ainda que o commit de A esteja confirmado. Isso confundiria retries com despesas legítimas coincidentes e retornaria um sucesso indevido.

**Bloqueio de design:** para satisfazer todas as cinco restrições será preciso um sinal causal novo e confiável ou uma revisão explícita de pelo menos uma restrição (por exemplo, aceitar revisão humana temporária ou risco residual de duplicação). Nenhuma das opções pode ser ativada silenciosamente nem ser apresentada como garantia zero-perda/zero-duplicação.

**Próximo passo seguro:** decidir formalmente a política para B ambíguo e, se houver evidência adicional de identidade que não exija atualização das APKs, caracterizá-la primeiro em HTTP/JWT/PG17 descartável. Só depois especificar migrations aditivas, alterações em escritores e gates de rollout/rollback. Issue #699 permanece OPEN/P0. PR #705 Draft; sem merge, deploy ou alteração de Android estável.
