# MEG Finanças | Etapa 10 | Issue #699 | Fase A
## Contrato de compatibilidade server-side por fingerprint temporal: parecer de viabilidade e proposta condicionada

**Data:** 24/11/2026  
**Estado:** POLÍTICA DE RISCO EXPRESSAMENTE DECIDIDA; CONTRATO DOCUMENTAL, NÃO IMPLEMENTADO E NÃO HOMOLOGADO.  
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
- I5. Replay comprovado pelo **mesmo operationId e mesmo requestHash** não pode criar segundo FinancialEvent, LedgerEntry ou efeito financeiro. Novo operationId nunca autoriza supressão automática por mera equivalência de fingerprint/tempo.
- I6. O estado autoritativo é o servidor: ID real do evento, sua situação vigente, recibo de mutação, transação e vínculos. Resposta perdida não desfaz commit, e o servidor não deve presumir que ACK de rede foi consumido.
- I7. Isolamento estrito por workspace, usuário autorizado e domínio monetário. Não mover benefício, cartão, transferência ou PUT/PATCH do AppState para o writer de despesas.
- I8. Nunca reintroduzir lançamento arquivado, exceder saldo, criar ledger sem lançamento legítimo, violar vínculos, nem esconder uma rejeição financeira verdadeira.
- I9. A suspeita deve ficar registrada para **ambos os eventos** e estar acessível por caminho de revisão humana autenticado e autorizado, sem bloquear lançamentos válidos nem exigir nova UI na APK congelada.
- I10. Toda correção da duplicata é ato humano explícito, auditável, com reversão contábil/arquivamento seguro conforme regras vigentes. O presente contrato não autoriza exclusão física, fusão automática nem criação de funcionalidade visual fora da etapa.

### 3. Limite formal: por que fingerprint + tempo NÃO demonstram identidade

Considere duas histórias, com o mesmo estado de banco antes da segunda chamada e exatamente os mesmos dois HTTP POSTs: mesmo workspace/usuário autenticado, mesmo valor, data, descrição, conta, categoria, método, status, notas, horário de chegada e operationIds A e B diferentes.

- **História R:** A criou o evento e houve perda da resposta. B é retry da mesma despesa. Decisão exigida: suprimir B e retornar a confirmação de A.
- **História N:** A criou o evento. O usuário realizou outra despesa legítima idêntica. B é a nova intenção. Decisão exigida: criar B, não suprimir e não devolver o evento A como se fosse B.

O servidor pode saber que A foi gravada; isso **não revela** se B é R ou N. Até um sinal de socket fechado antes do ACK apenas demonstra entrega incerta, não a intenção do segundo POST. Um fingerprint completo e uma janela de poucos segundos não alteram esta indistinguibilidade.

**Conclusão lógica preservada, com política de risco agora decidida:** sem prova causal, não se garante simultaneamente zero duplicação e zero perda. Na história R, a nova política aceita **duplicata possível e visível** ao criar B; na história N, preserva a despesa legítima. A invariável I5 aplica-se apenas a replay **comprovado pelo mesmo operationId e hash**, não a coincidência semântica de operações distintas. Não apresentar o risco residual aceito como garantia de ausência total de duplicatas.

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

**4.3. Registro auditável e sinalização (esquema ainda NÃO autorizado)**

Desenho conceitual de registro append-only de tentativas: attemptId, workspaceId, actorId, incomingOperationId, fingerprintVersion, fingerprintHash, serverReceivedAt, predecessorEventId/predecessorOperationId candidatos, outcome, createdEventId, requestHash, referência de receipt e identificador de agrupamento de suspeita. O hash não substitui o corpo financeiro canônico nem o controle por operationId. Não persistir JWT, senhas ou credenciais; observar LGPD, retenção e autorização de leitura.

Outcomes conceituais: NEW_CREATED, VERIFIED_ID_REPLAY, SUSPECTED_DISTINCT_ID_CREATED, DISTINCT_INTENT_CREATED, REJECTED_INVALID, HUMAN_REVIEW_CONFIRMED_DUPLICATE, HUMAN_REVIEW_CONFIRMED_DISTINCT, CORRECTION_APPLIED, CORRECTION_REVERSED. São nomes de **contrato proposto**, não valores de enum já existentes.

- **Primeiro evento A:** criação válida como de costume. Quando chegar B com mesmo fingerprint e outro ID, **acrescentar** registro de suspeita referente a A e B, relacionando as duas entidades por IDs persistidos. O lançamento A continua financeiramente autoritativo e inalterado.
- **Segundo evento B:** se passar por todas as validações financeiras normais, gravar B, LedgerEntry aplicável, receipt de B e auditorias da criação/suspeita, em transação serializável. Não suprimir, arquivar, reclassificar ou modificar valores por fingerprint.
- **Revisão:** disponibilizar consulta read-only autenticada para usuário autorizado ou suporte, com IDs de ambos os eventos, vínculo de suspeita, hora, motivo e estado de revisão. A disponibilidade **precisa ser implementada e comprovada**; não presumir que APK706/707/708 ou a UI atual exibam uma mensagem nova. O caminho mínimo de compatibilidade pode ser de suporte, sem mudanças no cliente legado. Nenhum aviso deve bloquear o POST.
- **Correção humana:** exigir identificação e autorização explícita da ação, confirmação de qual operação é indevida, vínculo de correção e possibilidade comprovada de reversão. Não inventar endpoint de exclusão/mesclagem: usar ou especificar separadamente operação financeira canônica auditável que preserve LedgerEntry, saldos e referências.
- **Incerteza:** marcar **suspeita**, não duplicata confirmada. Uma revisão que conclua serem duas despesas distintas registra a decisão e preserva ambas.

**4.4. Máquina de decisão e contrato HTTP para clientes congelados**

| Condição | Decisão obrigatória | Resposta HTTP/efeito |
| --- | --- | --- |
| Novo pedido sem predecessor coincidente, válido pelas regras financeiras | Criar FinancialEvent, ledger quando cabível, receipt e auditoria | **201** existente, corpo canônico do evento efetivamente gravado |
| Mesmo operationId + mesmo requestHash, recibo íntegro | Replay realmente comprovado: 0 novas gravações financeiras; registrar consulta/replay conforme política de auditoria | Sucesso já compreendido pelo cliente, evento do recibo; sem pending |
| Mesmo operationId + payload divergente | Rejeição de reutilização da identidade, sem novo FinancialEvent | 409 de contrato existente, sem falso sucesso |
| **Novo operationId B + mesmo fingerprint de A dentro da janela, sem prova causal** | **Criar B se financeiramente válido**, preservando A; registrar suspeita vinculada em auditoria de **ambos** | **201 existente** com o **ID novo de B**, não devolver A como se fosse B; aviso separado de suporte/revisão |
| Novo operationId B + fingerprint distinto | Criar B normalmente quando válido, sem falsa associação | 201 e evento B |
| Nova requisição inválida por saldo insuficiente, escopo, categoria, status ou outra regra real | Recusar pelo motivo financeiro próprio, mesmo quando o fingerprint coincidir | Erro já existente da API, sem 201 e sem escrita financeira |
| Revisão humana da suspeita | Preservar ambos até decisão explícita; corrigir apenas pelo escritor canônico/fluxo de reversão previamente aprovado | Nenhuma exclusão ou mesclagem automática |

**Compatibilidade:** a API candidata responde HTTP 201 no POST de criação. O cliente legado aceita essa confirmação; não trocar para um novo código, não usar 200 com pending:true nem exigir novo header. A sinalização pode ocorrer em auditoria/suporte independente da resposta original, desde que seja realmente acessível a operadores autorizados. Não incluir campos novos obrigatórios para o cliente.

**Limite de supressão:** **somente o par (workspaceId, operationId) com hash idêntico comprovado pelo receipt** permite replay sem segunda escrita. Um novo ID jamais recebe automaticamente o recibo de A como resultado de B, mesmo que tempo, payload, IP, sessão e estado da conexão coincidam.

### 5. DECISÃO OFICIAL DE POLÍTICA DE RISCO RESIDUAL DA FASE A

**Aprovada por decisão explícita do usuário em 24/11/2026: P1 (criar e auditar) é a política definitiva para ambiguidade por fingerprint.**

- **Erro priorizado para evitar:** supressão silenciosa de uma segunda despesa legítima, que pode impedir registro de obrigação verdadeira e mascarar o ocorrido.
- **Risco residual aceito:** duas despesas visíveis podem permanecer quando a segunda for retry após perda de resposta, até revisão humana. Este risco deve ser sinalizado e tratado, não afirmado como inexistente.
- **Proibição:** não aplicar P3 (supressão automática por fingerprint/tempo) nem P2 (reter despesa válida para revisão) aos casos ambíguos. Nenhum retorno de sucesso com ID de outra intenção; nenhum 409 unicamente por similaridade semântica no fluxo abrangido pela política.
- **Exceção de idempotência verdadeira:** somente mesmo operationId e mesmo conteúdo/recibo persistido autoriza não criar segundo evento, independentemente de janela. Mesmo ID com conteúdo diferente continua rejeitado.
- **Validações financeiras não são dispensadas:** sempre criar uma **despesa válida** no cenário ambíguo, respeitando saldo real, status, escopo, permissões, atomicidade e writer canônico. Falta de saldo verdadeira não se converte em duplicidade suprimida, nem em criação forçada.
- **Sinalização humana não bloqueante:** registrar ambos na auditoria, correlacionar com candidato anterior e disponibilizar visão autenticada para usuário/suporte. A UI legado congelada não ganha aviso por decreto; a entrega exige demonstrar efetivamente um caminho de suporte, e a futura UI própria só será implementada na etapa/autorização apropriada.
- **Resolução manual:** confirmar duplicata ou duas despesas distintas, sem exclusão física silenciosa. Toda correção deve ser explícita, auditável, com salvaguarda de reversibilidade compatível com o estado financeiro.
- **Sem afirmação de perfeição:** o contrato resolve a decisão de política, não o limite matemático. O sistema preserva dados e torna provável duplicação verificável, aceitando risco residual de duplicata financeira até intervenção.

**Conflito relevante com o código atual:** a guarda existente \`findRecentFinancialEventDuplicate\` com janela \`SEMANTIC_DUPLICATE_WINDOW_MS = 10 * 60_000\` devolve \`POSSIBLE_DUPLICATE\`/HTTP 409 quando \`allowDuplicate\` é falso. Um cliente legado sem confirmação nova pode ficar bloqueado, contrariando esta política. A implementação FUTURA precisará alterar **controladamente** o comportamento dessa guarda no escopo de criação legada autorizado, de bloqueio para detecção e auditoria, mantendo idempotência por ID e proteções de saldo. **Não fazer essa alteração nesta entrega documental**; o gate A18 deve demonstrá-la no banco descartável antes de qualquer merge/deploy.

### 6. Autoridade transacional, concorrência e revisão segura

1. Validar JWT, papel e workspace antes de consultar fingerprints ou receipts, impedindo vazamentos entre tenants. Fingerprint contextual é indexável apenas para busca de suspeita, sem UNIQUE que barre duas despesas.
2. Checar primeiro recibo por workspaceId+operationId e requestHash: mesmo conteúdo é replay; payload divergente é rejeição. Proibir mudança de identidade por expurgo desprotegido de recibos/tombstones.
3. Para ID novo, usar fingerprint versionado de conteúdo financeiro completo e janela de 10 minutos **somente para detectar candidatos**; a data informada no lançamento não controla a janela. Diferenciar descrição, valor em centavos/Decimal, competência, status e IDs de entidades.
4. Para duas intenções com IDs diferentes e sem invalidade real, **inserir B mesmo que A exista**. Eventos, LedgerEntry aplicáveis, receipts e registros de suspeita devem obedecer transação serializável e invariantes de saldo; retry de conflito transacional não pode gravar uma terceira cópia.
5. Associar A e B por registros de auditoria/versionamento, sem editar automaticamente o histórico financeiro de A. A auditoria do segundo evento e o alerta auditável de A devem ser consistentes e recuperáveis. Falha em auditoria obrigatória deve fazer rollback da operação inteira, nunca deixar evento sem trilha.
6. A UI/APK existente só vê sucesso quando B realmente foi gravado. A indicação de suspeita é **observável em canal autorizado separado** e não bloqueia o POST. Provar visibilidade e permissões como gate, sem inventar tela aprovada.
7. Após decisão humana, preservar o evento original e aplicar apenas a correção financeira explicitamente autorizada, com reversão e trilha de auditoria. Não usar DELETE físico de event/ledger nem chamar de reversível uma operação sem reversão comprovada.
8. Marcar recibos, auditoria e suspeitas para retenção protegida, respeitando RLS, LGPD, trilhas de restauração e controles de expurgo; não considerar \`expiresAt\` automaticamente cumprido como retenção real.
9. Não estender esta decisão automaticamente a benefícios, cartões, transferência, fatura, pendentes, PATCH/PUT de AppState ou ao histórico da #700. Esses domínios têm escritores e riscos separados.

### 7. MATRIZ OFICIAL DE ACEITE A01–A18 (DEFINIDA, AINDA NÃO EXECUTADA)

**Ambiente exigido:** HTTP Fastify REAL + JWT válido de teste + PostgreSQL 17 descartável, contas e saldos sintéticos, aplicação de schemas só no banco fictício, API e rede isoladas. Executar os gates novos sem repetir PT63–PT217 já aprovados. Todos os testes devem comparar IDs, valores, receipts, LedgerEntry, AuditLog, saldos e vínculo de suspeita antes/depois, e registrar rollback e limpeza.

**Critério global:** o resultado esperado é **preservação integral de todas as intenções distintas**, risco de duplicatas de retry **explicitamente aceito e sinalizado**, e idempotência verdadeira por ID com escrita única. Não apresentar esse conjunto como garantia de zero duplicação para IDs diferentes. Uma coincidência semântica não pode causar 409 de possível duplicata nem ausência de escrita de despesa válida.

| Gate | Cenário a executar | Assert obrigatório para PASS |
| --- | --- | --- |
| **A01** | POST /finance/events inicial com ID X, despesa paga monetária válida | HTTP 201, FinancialEvent X gravado, LedgerEntry aplicável único, recibo e auditoria válidos; saldo correto |
| **A02** | Commit no PG17, perder ACK e reenviar **o mesmo X** com mesmo payload | Mesmo FinancialEvent, mesmo recibo e nenhum novo efeito monetário; replay 2xx compatível; 1 evento/1 ledger |
| **A03** | Reutilizar X com conteúdo diferente | HTTP 409 já conhecido; nenhuma mutação financeira, operação original preservada |
| **A04** | Commit de X, perder ACK, reenviar Y diferente com payload idêntico na janela | **Dois FinancialEvent diferentes**, dois receipts/ledgers aplicáveis, saldo refletindo duas escritas; suspeita vinculando X↔Y na auditoria; Y recebe 201 com seu ID, nunca ID de X. **Duplicação residual esperada e aceita**, não classificar como bug de gate |
| **A05** | Duas despesas realmente distintas e idênticas, X e Y, na mesma janela | Exatamente dois eventos persistidos, nunca falso replay, exclusão, 409 semântico ou bloqueio; vincular suspeita e preservar decisão humana possível |
| **A06** | Reproduzir A04 e A05 com HTTP/estado indistinguíveis | **Mesma decisão conservadora nos dois casos** (criar dois + auditar), sem inferência causal; aceitar possível duplicata em A04 |
| **A07** | Alterar individualmente conta, categoria, pagamento, tipo, status, competência, notas, descrição, data, valor (inclusive R$0,01), owner ou workspace | Fingerprint distinto quando a semântica muda, sem associação indevida; dinheiro exato em centavos/Decimal |
| **A08** | Mesma despesa em dois workspaces/usuários com JWTs distintos, incluindo papel sem permissão | Nenhum cruzamento de busca, suspeita, receipt, dados ou auditoria; acesso negado à leitura não autorizada |
| **A09** | 2–20 requisições concorrentes com **mesmo X e payload** | Exatamente 1 evento/ledger/receipt, todos os replays coerentes e transação serializável; nenhum saldo duplicado |
| **A10** | 2–20 operações concorrentes com **IDs diferentes e mesmo fingerprint**, todas financeiramente válidas | Todos os IDs autorizados geram eventos próprios, sem índice UNIQUE/filtro que descarte; grupos de suspeita auditáveis e integridade de saldos |
| **A11** | Verificar trilha de suspeita para **ambos A e B**, consulta read-only do usuário/suporte autorizado e revisão humana | Logs vinculam IDs, horários, motivo e estado; alerta é observável sem alterar APK; sem aviso bloqueante; não autorizado não visualiza; revisão confirmando "distintas" preserva ambos |
| **A12** | Injetar falhas entre criação, ledger, receipt, auditoria de A/B e vínculo da suspeita | Rollback integral do grupo necessário; nunca 2xx antes do commit, nem evento sem recibo/auditoria exigida, nem perda silenciosa |
| **A13** | Predecessor arquivado, estornado ou editado; tentativa nova com ID distinto | Nunca ressuscitar nem usar ID de predecessor em sucesso; nova operação só se válida, histórico/vínculos preservados; revisão/correção auditáveis e reversíveis |
| **A14** | Recibo vencido, excluído deliberadamente no banco descartável e reuso de ID antigo | Não permitir escrita como nova sem controle confiável de tombstone/retention; testar recuperação/fail-closed sem apagar histórico financeiro |
| **A15** | APK708 original via CapacitorHttp nativo: 409, 422, timeout, retry, resposta 201 de criação distinta e sem novos headers | Compatibilidade comprovada em emulador isolado; UI aceita 201 real, novo ID e nenhuma exigência de protocolo novo; não repetir caracterizações já aprovadas além do necessário |
| **A16** | APKs originais 706 e 707, em emulador isolado, com novos casos de sinalização server-side | Confirmar tolerância ao comportamento de API sem modificação do APK. Se não testadas dinamicamente, gate permanece **PENDENTE**, mesmo com hash semelhante |
| **A17** | Regressão financeira: Verocard benefício, cartões, faturas, transferências, pendentes, PATCH/PUT, importações, RLS, LGPD e referências financeiras | Nenhum desvio de writer, saldo, atomicidade, FK, reversão, autorização ou funcionalidade fora do escopo; sem aprovar tela visualmente |
| **A18** | **Regressão P0 específica:** duas despesas idênticas válidas em menos de 10 min com \`allowDuplicate\` ausente/falso na API candidata | A guarda \`POSSIBLE_DUPLICATE\` **não bloqueia** a segunda apenas por semelhança; HTTP 201 real para X e Y, **2 FinancialEvent + recibos + ledger aplicável**, auditoria e sinalização em ambos. Com mesmo X repetido: **1 evento**. Nenhuma exclusão/mesclagem automática |

**GATE NÃO NEGOCIÁVEL:** A04 + A05 + A06 + A11 + A18 precisam ser PASS simultaneamente: dupla criação válida e sinalização, nunca descarte silencioso. A01–A18 só podem ser declarados aprovados quando as respectivas evidências existirem; A16 não se converte em PASS pelo inventário estático. A14 exige tratar política de tombstones/retention antes de aceitar expurgo. Não confundir CI/build verde com aprovação funcional ou visual.

**Sem implementação nesta decisão:** a API existente ainda pode retornar POSSIBLE_DUPLICATE/409 e não cumpre A04/A05/A18. A matriz é critério de aceite FUTURO, não resultado executado.

### 8. Estado e autorização

**Decisão de risco: APROVADA como política documental de Fase A.** O contrato substitui a parte indecisa de alternativas P1/P2/P3 da versão anterior: **P1 é obrigatória; P2 e P3 estão proibidas para ambiguidade financeira válida**.

**Não implementado:** fingerprint versionado/consultável, auditoria de suspeita bilateral, caminho autorizado de revisão, reversão manual e mudança da guarda \`POSSIBLE_DUPLICATE\`. Nenhuma dessas funcionalidades deve ser descrita como já existente. A camada financeira, migrations e qualquer interface dependem de testes isolados, autorização de implementação e dos gates correspondentes.

**Risco residual formalmente aceito:** possibilidade de duplicação visível e reconciliável em caso de resposta perdida seguida de nova intenção/ID no cliente legado. Inexistência de perda silenciosa por **supressão heurística** é prioridade maior. Isso não elimina riscos por falhas externas, indisponibilidade ou saldo insuficiente.

**Bloqueios preservados:** Issue #699 OPEN/P0, PR #705 Draft; nenhuma alteração em Android estável, produção, writers, bancos protegidos, merge ou deploy. A Fase A de política está definida, **a implementação e homologação A01–A18 permanecem pendentes**.

**Próximo passo exato:** com autorização específica em momento posterior, preparar e executar em branch QA isolada um primeiro gate de caracterização A04/A05/A18 da guarda atual, sem escrever produção, e definir formalmente schema aditivo de auditoria/sinalização; só depois implementar em writer e rodar toda A01–A18.
