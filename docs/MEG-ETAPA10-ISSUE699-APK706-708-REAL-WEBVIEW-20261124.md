# Etapa 10 | Issue #699 | APKs 706/707/708 e WebView original, caracterização incremental
**Data:** 24/11/2026. **Estado:** INVESTIGAÇÃO EM CURSO, SEM PROTOCOLO DEFINITIVO DE COMPATIBILIDADE. Nenhum writer financeiro, APK instalada, produção, Render, Supabase ou banco real alterado. PR #705 permanece Draft. Este é um documento de evidência **antes** da implementação produtiva.

## 1. Proveniência e versão
GitHub Release pública `android-latest` contém 200 APKs numeradas (400–708, com lacunas), além de `MEG-Financas.apk` e manifesto. Estas são versões **disponíveis** para download, não contagem de instalações ativas. Existe a release separada `android-rc1-latest`.
- APK 706: 6.715.743 bytes, SHA256 `d12bd3b1995609cfdc62db314b1916b54f94e83ee8c3e9d77a89fb3d77f942c1`.
- APK 707: 6.715.710 bytes, SHA256 `0a4554d1881e736e088e9db05eb7b5592e95667f5d1d5aeb1a17247cf926e6da`.
- APK 708: 6.715.918 bytes, SHA256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`.
- Manifesto público `app-version.json`: `versionCode:708`, `versionName:2.0.708`, `mandatory:false`; não comprova que versões antigas tenham sido desinstaladas.
- GitHub downloads observados: 706=0, 707=0, 708=9, artefato genérico `MEG-Financas.apk`=148. São contadores do serviço, **não telemetria de aparelhos ou de usuários**. Versões instaladas/ativas em produção **DESCONHECIDAS**, sem autorização para ler sistemas produtivos.
- As três APKs contêm 12 bundles JS em `assets/public/assets/`, o transporte com `AbortSignal.timeout(45000)`, `/finance/events` e `/app-state`, mas **não** a rota literal `/app-state/transactions` nos bundles examinados. Similitude estática não prova compatibilidade de UI ou cliente inteiro.

## 2. Emulador de APK original, sem reempacotamento
GitHub Actions [45428199211](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45428199211), SUCCESS: APK 708 original baixada e SHA conferido, Android Emulator API35 descartável, regras de `iptables` instaladas **antes de lançar o APK** bloqueando conexões públicas; WebView publicada iniciou em `https://localhost`, Chrome DevTools disponível (`webview_devtools_remote`). Sem uso da API produtiva.

GitHub Actions [45429026249](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45429026249), SUCCESS **do probe**, mas login não passou: APK habilita CapacitorHttp nativo; interceptação inicial CDP não alcançou a requisição de login. Erro visível foi `Não foi possível entrar`. Isso caracteriza limitação do harness, não problema confirmado de login do produto.

GitHub Actions [45429705877](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45429705877), SUCCESS: somente **na WebView descartável**, `window.fetch` restaurado a partir de `window.CapacitorWebFetch`, mantendo o bundle JS/UI do APK intacto e bloqueio de egress; login com usuário fictício chegou à Home após alinhar o mock ao contrato `/finance/phoenix-preview`. Este shim muda o transporte nativo para browser fetch **no teste**. Portanto o teste da interface não equivale a validar todos os aspectos nativos do CapacitorHttp.

GitHub Actions [45430224460](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45430224460), SUCCESS: Home real da APK exibiu conta de teste com saldo fictício R$500,00, o botão inferior `Novo`, sem dados reais.

GitHub Actions [45430724549](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45430724549), SUCCESS: clique no botão real `Novo` abriu seletor `O que deseja lançar?` com `Despesa`, `Receita` e `Alimentação`.

GitHub Actions [45431219269](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45431219269), SUCCESS: `Despesa` abriu o formulário original, com Descrição (autocomplete), Categoria*, Modalidade à vista/crédito, Forma de pagamento*, Conta*, Data do lançamento, Valor, Situação Pago/Pendente, Observações e botão `Salvar lançamento`. Campo de texto e valor não são provas de POST até confirmar o fluxo.

GitHub Actions [45431813357](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45431813357), SUCCESS do harness: primeiro preenchimento sintético avançou até seletor Categoria; a automação não selecionou opção cujo texto possuía uma segunda linha (`Alimentação QA\\nPessoal`). Nenhum `POST /finance/events` foi disparado. Corrigido **somente seletor de QA**; próxima execução [45432322635](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45432322635) em andamento à data desta versão do documento. Não atribuir sucesso/fracasso financeiro ao código com base em erro do seletor QA.

## 3. Contratos identificados em código original
A APK usa `POST /finance/events` para lançamento, além de writers específicos para benefício, cartão e transferências. A função comum de transporte do JS embarcado foi testada isoladamente contra HTTP local: 409/422/503 geram rejeição **sem retry nesta função**; 401 gera refresh e mais uma requisição; timeout rejeita. **Não deduzir ausência de listeners/retries de tela ou de fila local a partir dessa prova isolada.**
O bundle da APK contém lógica de UI para `POSSIBLE_DUPLICATE`, incluindo `Confirmar possível duplicidade`, e mantém referência de operação preparada em fluxos Phoenix. A compatibilidade do protocolo real, inclusive resposta API/recibo, depende da validação em WebView e deve ser medida, não presumida.
O banco IndexedDB dos bundles 706/707/708 inclui `meg-phoenix-runtime`/`monthly-snapshots`: é cache de **leitura**, não prova de outbox financeiro. Não foram localizados marcadores literais `outbox`, `addEventListener("online"` nem `navigator.onLine` no bundle principal; isso não exclui outras filas, listeners ou comportamentos de outras versões.

## 4. Gates ainda não comprovados
1. Payload JSON **exato** do `POST /finance/events` gerado pelo formulário real ao confirmar Despesa fictícia.
2. Timeout após commit em API local e replay subsequente: observar e comparar IDs/headers/body, estado da tela, confirmação e comportamento.
3. Reações visuais reais a 409, 422 e `POSSIBLE_DUPLICATE`: mensagem, travamento, retry manual, event listeners, número de HTTP requests no intervalo observado.
4. Forçar desconexão/reconexão da WebView e verificar possíveis envios adicionais automáticos e persistência local. Nenhuma negativa absoluta pode ser declarada com observação curta.
5. Comparar execução do transporte **nativo CapacitorHttp** com modo browser-fallback de QA; a extração original não autoriza atribuir payload/timeout ao native quando somente o fallback foi exercitado.
6. Versões ativas em produção: requer fonte de telemetria autorizada/privada e identidade de versão confiável. GitHub releases e downloads não suprem esse dado.

## 5. Limite de segurança e decisão provisória
Não introduzir erro HTTP novo que cause loop na APK velha. **Não usar HTTP 200 pendente**: no transporte JS original, `200 {pending:true}` é interpretado como sucesso e invalida cache. HTTP 200 só para operação realmente confirmada/replay idempotente comprovado. Não suprimir despesas legítimas iguais com hash de valor/data/descrição. **Nenhum protocolo definitivo aprovado** e nenhuma alteração de writer financeiro até fechar os gates acima.

## 6. Artefatos de QA
- `.github/workflows/meg-stage10-issue699-apk708-webview-original.yml`, runner GitHub isolado, APK hash pinada, firewall antes do start.
- `scripts/meg-stage10-issue699-apk708-real-ui-probe.mjs`: harness WebView CDP e API local sintética; não constitui teste de produção.
- Arquivos TEMP locais para auditoria estática 706/707/708 foram baixados no NITROMEG e não instalados.


## 7. ADENDO VERIFICADO: payload completo real e retry com ID diferente na APK708

**Rota de teste:** [GitHub Actions #45432322635](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45432322635) com browser-fetch shim apenas no emulador, origem WebView `https://localhost`, APK708 original com hash verificado, API HTTP local fictícia. **Payload gerado pela UI**, não inventado pelo harness:

```json
{
  "description":"ISSUE699 QA DESPESA FICTÍCIA",
  "type":"expense",
  "status":"paid",
  "date":"2026-11-24",
  "amount":12.35,
  "accountId":"issue699-account",
  "categoryId":"issue699-category",
  "paymentMethodId":"issue699-payment",
  "operationId":"phoenix-event-93d936dc-6681-4ae5-8eae-f88310fc8308"
}
```

O primeiro mock continha bug **do harness**: `/finance/events` respondeu sucesso por GET fallback mesmo no POST. A tela exibiu `LANÇAMENTO SALVO` e essa execução **NÃO** foi usada para validar HTTP409. Foi corrigido o roteamento local para conferir método HTTP antes de escrever resposta; nenhum código de produto alterado.

**Gate decisivo:** [GitHub Actions #45432925875](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45432925875) COMPLETED/SUCCESS. Formulário real preenchido pela UI, não payload manual. Quatro POSTs da MESMA despesa no mesmo formulário, com `operationId` distintos:

| Tentativa | Resposta simulada | operationId |
|---|---|---|
| 1 | HTTP409 `STATE_CONFLICT` | `phoenix-event-41412ebb-9084-4223-8a53-5e0ca392327e` |
| 2, retry manual | HTTP422 | `phoenix-event-b839bd16-930a-4c69-99fe-48e34929590c` |
| 3, retry manual | Timeout da função de transporte após commit no **mock local** e resposta retida por 51s | `phoenix-event-00bd5271-8198-4738-8b35-685f43ca78b6` |
| 4, retry manual | HTTP201 fictício | `phoenix-event-9d2f4b25-c795-453d-8fa9-4df8a532277b` |

Valores, conta, categoria, método, data, descrição e status iguais nos quatro payloads. No terceiro POST, o servidor fictício marcou a intenção como committed antes de reter a resposta; isso **não equivale a commit PostgreSQL**, mas caracteriza o fluxo de rede/identidade do cliente. No quarto POST, a UI gerou novo operationId. **RISCO P0 CONCRETO:** cliente não preservou identidade da intenção entre tentativas manuais no percurso testado; API que garante idempotência apenas por operationId não reconheceria o quarto POST como replay da terceira intenção.

**UI real após HTTP409 e HTTP422:** a tela preservou formulário/valores e exibiu `Não foi possível confirmar o lançamento no servidor. Os dados foram mantidos para nova tentativa.`; botão `Salvar lançamento` continuou habilitado. Após timeout, mesma mensagem, mesmo formulário, retry manual permitido; após resposta fictícia de sucesso, UI exibiu `LANÇAMENTO SALVO`.

**Provas de retry automático nesta observação limitada:** após 409, contagem de POSTs 1→1 durante 3,3s; após 422, 2→2 durante 3,3s; após evento sintético `online`/`focus` após timeout, 3→3 durante 6,5s. Não prova ausência de retries em outros eventos, maior janela, reinício ou filas locais. O teste **não** validou native CapacitorHttp nem outras APKs.

**Consequência:** este achado não autoriza HTTP200 `pending:true`, deduplicação por hash ou mudança de API. A caracterização da tela está avançada, mas persistência offline/reinício, modo nativo e versões efetivamente ativas permanecem pendentes. O protocolo definitivo continua NÃO aprovado, escritores financeiros intocados.


## 8. ADENDO FINAL: inspeção de armazenamento e reconexão após timeout real do JS

**Evidência:** [GitHub Actions #45433890828](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45433890828), job `138586334195`, COMPLETED/SUCCESS. HEAD testado `d638b4a08bd90d3e22a24ef5757eabc5711bc811`. APK708 original, hash fixado, WebView no Android Emulator isolado, navegador com `window.CapacitorWebFetch` restaurado somente no teste para interceptação CDP, API fictícia local, egress bloqueado. Não houve writer financeiro nem banco PostgreSQL nesse ensaio.

Após o POST #3 de despesa fictícia, cujo servidor **sintético** contabilizou como commit e reteve resposta por 51 segundos, o JS embarcado expirou seu timeout padrão de 45 segundos. A UI exibiu o erro de confirmação, mantendo os dados e permitindo reenvio manual.

Inspeção do estado da WebView, sem despejar valores de autenticação:

```json
{
  "localStorageKeys": [],
  "sessionStorageKeys": ["meg.auth.session"],
  "indexedDbStores": [
    {"name": "meg-phoenix-runtime", "stores": ["monthly-snapshots"]}
  ],
  "phoenixCreateJournal": null
}
```

O banco IndexedDB inspecionado contém uma store de **snapshot de leitura**, não uma store de operações financeiras pendentes. Esta inspeção não prova a inexistência de qualquer persistência em outros meios nativos ou versões, mas não encontrou journal da intenção financeira no armazenamento Web observado após o timeout.

A rede da WebView foi alternada via Chrome DevTools Protocol: `Network.emulateNetworkConditions(offline:true)` seguido de `offline:false`, sem alterar o firewall externo do emulador. Marcadores verificados:

```text
ISSUE699_APK708_NETWORK_OFFLINE_ONLINE=CDP_OFFLINE_ONLINE_APPLIED
ISSUE699_APK708_RECONNECT_AUTO_RETRY_WINDOW={"before":3,"after":3,"seconds":6.5}
ISSUE699_APK708_TIMEOUT_MANUAL_RETRY_CLICK=true
ISSUE699_APK708_SYNTHETIC_COMMITTED=1
```

A quarta tentativa manual foi aceita pelo servidor fictício e a UI apresentou `LANÇAMENTO SALVO`; todos os campos financeiros foram mantidos, **mas o operationId mudou**. IDs observados na execução:

1. HTTP409: `phoenix-event-179ef492-ea78-4695-8834-2542ef4f0f92`.
2. HTTP422: `phoenix-event-af45766c-b02a-44ea-a91e-aa6a9168c6ba`.
3. Timeout após marcação de commit sintético: `phoenix-event-d52013e7-1cbb-40d4-8d8f-423a599b2401`.
4. Retry manual com sucesso fictício: `phoenix-event-5f075df8-aa87-4467-8cb6-a24600f8efa6`.

Os quatro POSTs tiveram `description='ISSUE699 QA DESPESA FICTÍCIA'`, `type='expense'`, `status='paid'`, `date='2026-11-24'`, `amount=12.35`, `accountId='issue699-account'`, `categoryId='issue699-category'`, `paymentMethodId='issue699-payment'`. Os IDs acima são de operação, **não IDs persistidos de eventos PG17**.

### Veredito e limites da caracterização

**CONFIRMADO NA WEBVIEW 708 TESTADA:** mesmo formulário pode reenviar uma única intenção com operationId novo após erro/timeout; 409/422 não travam a tela; campo permanece; botão `Salvar lançamento` permite retry; mensagens de falha preservam dados; evento offline/online por CDP não disparou outro POST no intervalo observado; armazenamentos Web inspecionados não revelaram outbox durável da criação.

**AINDA NÃO COMPROVADO:** fidelidade do fluxo do **transporte nativo CapacitorHttp** (a WebView usa browser-fetch shim exclusivamente no QA); comportamento após morte/reinício completo da Activity; ausência absoluta de retry em prazo maior ou outras camadas; UI real das APKs 706 e 707; **distribuição de versões instaladas/ativas em produção**; duplicação efetiva em ledger/PG17 pelo writer `POST /finance/events` nesta sequência. GitHub Releases disponibiliza 200 APKs numeradas e o manifesto de atualização 708 tem `mandatory:false`, mas esses indicadores não são telemetria de instalações.

**Decisão:** NÃO propor protocolo definitivo de compatibilidade nem modificar escritores financeiros enquanto esses gates de segurança permanecerem sem evidência. HTTP 200 com `pending:true` é interpretado como sucesso pelo transporte JS, logo não é uma confirmação segura de operação pendente. O P0 #699 continua ABERTO.
