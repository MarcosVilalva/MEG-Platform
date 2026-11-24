# Issue #699 | APK708: caracterização do transporte embarcado e compatibilidade sem novo conceito no cliente

**Data:** 24/11/2026. **Estado:** investigação registrada; **sem alteração de escritores financeiros**. **Origem:** APK oficial de GitHub Release `MEG-Financas-708.apk`, pacote `br.com.megfinancas.app`, versão `2.0.708` (código 708). **SHA-256 efetivamente conferido:** `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`; tamanho 6.715.918 bytes.

## 1. Escopo e limites

A APK foi baixada **somente** de GitHub Release para diretório temporário no NITROMEG e inspecionada como ZIP, sem instalar/alterar a APK. Os arquivos `assets/public/assets/main-DdqA3NCE.js` e `preview-main-CZ7NN1h9.js` foram examinados diretamente. A função minificada de transporte `async function _(e,t)` foi **extraída byte a byte do bundle já distribuído**, sem substituição pelo JS atual do repositório, e executada em VM Node contra servidor HTTP local `127.0.0.1` com respostas controladas. Não houve acesso à API Render, Supabase, banco produtivo ou rede externa durante as requisições de teste. Não há dados reais nos payloads.

**Limitação crítica:** a investigação executou a função real do bundle, não a APK inteira em WebView nem todos os handlers de tela; não comprova ausência de retries em outros módulos/eventos ou em versões anteriores. Também não comprova que a APK 708 está instalada atualmente no dispositivo do usuário. Nenhum protocolo inventado pode ser atribuído a versões não inspecionadas.

## 2. Protocolo efetivamente identificado no bundle 708

- **Transporte HTTP comum:** `main-DdqA3NCE.js`, função `async function _(e,t)`, offset aproximado 3860. `fetch(`${Xc}${e}`, {...t, cache:'no-store', signal: t.signal || AbortSignal.timeout(45000), headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`, ...t.headers}})`.
- Em **HTTP 401**, chama `ru()` para refresh e repete **uma** vez o mesmo request com o token renovado. Outras respostas HTTP não-OK são convertidas em exceção via `Gc(payload,status)`.
- O corpo de sucesso é JSON (exceto HTTP 204, onde é `undefined`). Para qualquer HTTP 2xx com corpo JSON, a função retorna o objeto; ao ser mutação, invalida cache e emite `meg:data-invalidated`. **Não verifica `pending`, recibo idempotente ou confirmação financeira nesta camada.**
- `main-DdqA3NCE.js`: `createEvent:e=>D('/finance/events',{method:'POST',body:JSON.stringify(e)})`; também `PATCH /finance/events/:id`, `POST /finance/events/:id/settle` e outras rotas financeiras. O mesmo bundle contém `PATCH /app-state/properties` com `operationId` fornecido e `expectedRevision`.
- `preview-main-CZ7NN1h9.js`: o fluxo de **restauração de backup** faz `PUT /app-state` com `state` e `expectedRevision`. Esse fluxo trata conflito como erro e declara que não reenvia automaticamente o backup.
- As strings `app-state/transactions` e `megCloudConfirmation` **não foram encontradas** nos assets auditados da APK708. Não assumir que a rota de PATCH AppState usada nos testes da PR #705 é o writer de lançamento financeiro efetivamente usado por essa versão.
- `POST /finance/events` transporta exatamente o corpo fornecido pela tela; a reprodução abaixo utilizou payload **sintético** para inspecionar o transporte. O payload final produzido pela interface Android não foi capturado neste teste.

## 3. Teste real da função embarcada contra HTTP local

Executor temporário de QA `%TEMP%\\meg_apk708_http_characterization.cjs`, asset extraído em `%TEMP%\\meg-apk708-assets\\main-DdqA3NCE.js`. Servidor HTTP efêmero `127.0.0.1`, `fetch` do Node, `AbortSignal.timeout(200)` fornecido para acelerar exclusivamente o cenário de timeout. A função extraída usa **45.000 ms** como timeout default quando nenhum sinal é fornecido. `Authorization` usa token fictício; payload sintético `{description:'synthetic-only',type:'expense',amount:12.35,date:'2026-11-24',operationId:'QA_ONLY'}`. Teste de comportamento do transporte, não de validação do schema financeiro da API.

| Resposta de servidor simulada | Chamadas HTTP locais | Refresh de token | Resultado da função extraída | Invalidação de dados |
|---|---:|---:|---|---:|
| HTTP 200 com JSON de sucesso | 1 | 0 | Promise resolvida | 1 |
| HTTP 200 com `{error:'PENDING_REVIEW',pending:true}` | 1 | 0 | **Promise resolvida** | **1** |
| HTTP 409 | 1 | 0 | Exceção com status 409 | 0 |
| HTTP 422 | 1 | 0 | Exceção com status 422 | 0 |
| HTTP 503 | 1 | 0 | Exceção com status 503 | 0 |
| HTTP 401 e depois HTTP 200 | **2** | **1** | Promise resolvida | 1 |
| Sem resposta até timeout | 1 | 0 | `TimeoutError` | 0 |

**Cabeçalhos observados:** `Content-Type: application/json`, `Authorization: Bearer QA_FICTITIOUS_TOKEN`. `POST /finance/events` e JSON exatamente iguais no cenário 401 de repetição. Na simulação `timeout`, não houve segundo envio automático **pela função de transporte isolada**.

Logs emitidos pelo executor, com `requestCount` conferido e assertions:

```text
APK708_EXACT_TRANSPORT_200= requestCount=1 outcome=RESOLVED events=1
APK708_EXACT_TRANSPORT_200_PENDING= requestCount=1 outcome=RESOLVED events=1
APK708_EXACT_TRANSPORT_409= requestCount=1 outcome=REJECTED status=409 events=0
APK708_EXACT_TRANSPORT_422= requestCount=1 outcome=REJECTED status=422 events=0
APK708_EXACT_TRANSPORT_503= requestCount=1 outcome=REJECTED status=503 events=0
APK708_EXACT_TRANSPORT_REFRESH= requestCount=2 refreshes=1 outcome=RESOLVED
APK708_EXACT_TRANSPORT_TIMEOUT= requestCount=1 outcome=REJECTED name=TimeoutError
APK708_EXACT_BUNDLED_TRANSPORT_LOCAL_HTTP=PASS
```

Os valores resumidos acima são transcrição fiel dos campos de saída da execução; o log completo está na saída da sessão local. **Não afirmar validação completa da tela nem do WebView.**

## 4. Avaliação das respostas que o legado consegue tratar

**HTTP 409/422/503:** transporte rejeita sem retry interno, mas o tratamento pela tela que chamou o método não foi caracterizado para todos os writes. Não concluir que está livre de loop externo ou que uma rejeição tenha sido apresentada de modo claro.

**HTTP 401:** é **um caminho de retry automático comprovado**. A API não deve usar 401 para suspeita de duplicidade: isso faria refresh e reenviaria, com significado semântico errado.

**HTTP 200/202 com `pending` ou `error` no corpo:** o transporte considera sucesso e emite invalidação. Se o servidor não tiver feito commit nem puder devolver evento/recibo verdadeiro, esse caminho **pode gerar confirmação falsa/falha silenciosa**, dependendo dos handlers de tela. Portanto é **REJEITADA** a proposta de simplesmente devolver HTTP 200 enquanto uma análise assíncrona decide depois.

**Timeout:** a função de transporte rejeita; a camada de formulário/outbox poderá manter uma tentativa pendente ou permitir nova ação. Falta executar fluxo end-to-end de UI WebView e persistência para comprovar esse comportamento no app instalado.

## 5. Protocolo proposto sem exigir compreensão nova da APK antiga

1. **Manter os contratos existentes por rota e versão**. Não trocar status e shape HTTP no meio de uma operação financeira sem provar compatibilidade de todas as telas afetadas. A identidade financeira e idempotência explícita continuam obrigatórias para novos clientes que já conseguem produzi-las.
2. **Se a operação já tiver identidade confiável** (operationId ou ID estável vinculado a uma intenção durável), no servidor transacionar estado/ledger/recibo atomicamente; retry com mesma identidade retorna **HTTP 200 com o mesmo corpo de sucesso original**, `replayed` apenas como campo adicional compatível, e nenhuma segunda mutação. É um sucesso verdadeiro, não pendência artificial.
3. **Se o cliente não enviar identidade confiável e o segundo evento tiver ID novo**, não existe deduplicação perfeita usando apenas tempo, usuário, conta, data, valor e descrição. Uma heurística pode abrir alerta e trilha de revisão **sem descartar, suprimir, atrasar ou declarar sucesso falsamente**. Confirmar duas despesas idênticas legítimas continua obrigatório.
4. Para reduzir o risco sem pedir ao cliente antigo conceito novo, **priorizar proteção de invariantes do servidor já compatíveis**: autenticação, autorização por workspace, expectedRevision onde aplicável, unicidade de IDs estáveis, validação financeira, saldo, transação serializável e auditoria de suspeitas. Isso previne classes de corrupção, **mas não promete distinguir retries de ações legítimas idênticas com IDs novos**.
5. Qualquer modo de `quarantine`, `pending review` ou rejeição nova requer comprovação do comportamento do **handler da tela da APK real**. Se essa UI não souber exibir a decisão, são necessárias política explícita de compatibilidade e eventual atualização do aplicativo, ainda sujeita a autorização distinta. A Fase A aprovada não autoriza alteração da APK estável.
6. Não utilizar mecanismo assíncrono de 'aceitar agora/decidir depois' para mutação financeira quando o cliente espera confirmação síncrona. Só oferecer HTTP 200 após confirmação verificável, idempotente e consistente.
7. Instrumentação diagnóstica futura (em ambiente autorizado) pode registrar fingerprints de suspeita e correlação de sessão **sem afirmar prova de identidade**, com minimização LGPD; nenhuma telemetria produtiva foi habilitada neste levantamento.

## 6. Gates faltantes ANTES de implementar guarda legada

- Executar os handlers da **interface completa da APK708 em WebView/emulador isolado**, com servidor local e cenários 200, 409, 422, timeout e perda de resposta pós-commit. Conferir se retorna aviso, mantém intenção, oferece retry explícito ou gera nova operação.
- Verificar o `POST /finance/events` e writers de benefício/cartões/transferência em payloads realmente gerados pelo app; conferir IDs/operationId, headers, capturas e redirecionamentos. Não presumir que comportamento da função HTTP isolada cobre todos.
- Comparar com versões de APK ainda efetivamente usadas; telemetria de versões ativas **desconhecida**. A release 708 pode não representar todo cliente antigo.
- Usar PG17 descartável com API JWT real para confirmar que replay do mesmo ID não duplica finance/ledger, saldo e recibos. Os testes anteriores #699 demonstraram duplicação com IDs distintos no AppState, mas **não** equivalem a comprovação do writer `POST /finance/events` do APK708.
- Formalizar decisão sobre o caso matematicamente ambíguo de dois IDs distintos com mesmo conteúdo financeiro antes de habilitar novo comportamento HTTP para clientes legados.

## 7. Situação e limites

**#699 permanece OPEN P0; PR #705 Draft.** Estudo estático e harness local não liberam merge/deploy, não fecham a etapa e não permitem alegar compatibilidade integral com Android. Nenhum arquivo de produção foi modificado para obter estes resultados.
