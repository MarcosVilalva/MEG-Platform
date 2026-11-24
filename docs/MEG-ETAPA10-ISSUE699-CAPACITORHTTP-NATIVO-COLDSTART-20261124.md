# Etapa 10 | Issue #699 | CapacitorHttp nativo e cold start: investigação de compatibilidade

**Data:** 24/11/2026. **Status:** EM INVESTIGAÇÃO, SEM GATE NATIVO FINANCEIRO APROVADO. **Escopo:** APK original 708 em emulador GitHub Actions isolado, API fictícia local, nenhum escritor financeiro/Android estável/produção alterado. Não aprova protocolo de compatibilidade nem merge.

## 1. Objetivo e fonte de verdade
Comprovar em **CapacitorHttp Android nativo**, não em fallback `window.CapacitorWebFetch`, (i) POST/payload e headers reais, (ii) respostas 409 e 422, (iii) timeout e retry manual preservando ou substituindo `operationId`, (iv) cold start após perda de resposta/timeout, e (v) inventário de risco das versões 706/707.

Arquivo oficial: `MEG-Financas-708.apk`, release `android-latest`, SHA256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`. Nenhuma reengenharia do APK, somente análise estática e execução original no emulador. O harness não utiliza uma API financeira real nem dados produtivos.

## 2. Abordagem de instrumentação
- Um proxy HTTPS `mitmdump`, com addon `scripts/meg-stage10-issue699-native-proxy.py`, **nunca encaminha requisições à rede pública**. Somente o hostname exato `meg-platform-api.onrender.com` é mapeado para `127.0.0.1:3333` do runner, cuja API retorna dados sintéticos. Outros destinos recebem HTTP403 do proxy. `connection_strategy=lazy` evita conexão upstream.
- Regras do firewall do emulador bloqueiam egress público antes de iniciar o APK. Chave de CA de teste e certificados ficam exclusivamente no runner/AVD descartável; não são artefatos de produção e não devem ser exportados.
- O JavaScript original da APK preserva `CapacitorHttp.enabled=true`; o harness `scripts/meg-stage10-issue699-apk708-native-http-probe.mjs` **não restaura `window.fetch`**, e verifica `window.CapacitorHttpAndroidInterface.isEnabled()===true`. O mapeamento de rede fora da WebView é estritamente para o QA. Comparação futura com fallback dependerá do POST nativo realmente capturado.

## 3. Workflows e resultados documentados até agora
| Workflow | Evidência | Resultado real |
| --- | --- | --- |
| [45440700019](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45440700019) | Primeiro HTTPS probe | Infra FAIL: proxy não gerou cert, pois executável `mitmdump` não estava no PATH |
| [45441305903](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45441305903) | PATH corrigido | Infra FAIL: `HOME` alterado isolou o user-site Python; `ModuleNotFoundError: mitmproxy` |
| [45441812682](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45441812682) | Proxy e CA criados em Android 15 | FAIL de autenticação por TLS: `Trust anchor for certification path not found`; nenhum POST financeiro interceptado. `CapacitorHttpAndroidInterface.isEnabled()=true` |
| [45442349761](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45442349761) | Diagnóstico de TLS Android 15 | Certificado rejeitado pelo Android: `Client TLS handshake failed... certificate unknown` para API MEG. Não mede 409/422 nem timeout nativo |
| [45442951176](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45442951176) | Android 13 | Primeira chamada `adb remount` preparou overlayfs mas exigiu reboot; escrita da CA no sistema falhou como read-only |
| [45443530758](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45443530758) | Android 13 após dois reboots | CA instalada, mas proxy `10.0.2.2:8899` não foi acessível (`ENETUNREACH`); nenhum POST financeiro; não confundir com falha do APK |
| [45444361896](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45444361896) | Android 13 com CA de teste e `adb reverse`/`127.0.0.1:8899` | **SUCCESS, CapacitorHttp genuinamente ativo, POST /finance/events capturado via proxy HTTPS local, 409/422 com IDs distintos; resposta liberada após 51s aceita como sucesso** |

**Não declarar PASS nativo pelos marcadores `ORIGINAL_LOGIN_UI_VISIBLE` ou `LOCAL_UI_PROBE_COMPLETED`: eles não verificam login autenticado, writer, nem proxy.** Exigir `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS` com payload de `POST /finance/events` pelo proxy.

## 4. Risco equivalente das APKs 706 e 707

Arquivos efetivamente baixados da mesma release, inspecionados como ZIP, sem instalação:

| APK | SHA256 | Tamanho em bytes |
| --- | --- | ---: |
| 706 | `d12bd3b1995609cfdc62db314b1916b54f94e83ee8c3e9d77a89fb3d77f942c1` | 6.715.743 |
| 707 | `0a4554d1881e736e088e9db05eb7b5592e95667f5d1d5aeb1a17247cf926e6da` | 6.715.710 |
| 708 | `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6` | 6.715.918 |

Todas as três têm:
- `assets/capacitor.config.json` com `plugins.CapacitorHttp.enabled=true`.
- `assets/native-bridge.js` **binariamente idêntico** nas três, SHA256 `48b589d954751db7ebad3f5ef6983b523f96bab4c2db0b0f85b8a311b0123a5e`.
- Bundle principal de 304.067 bytes, com 14 ocorrências da rota `/finance/events`, 2 de `AbortSignal.timeout(45e3)`, 2 de `POSSIBLE_DUPLICATE`, nenhuma de `/app-state/transactions`.
- Estes padrões tornam os riscos de retry **plausivelmente compartilhados**, mas **não comprovam igualdade de estado React, dados persistidos, payload exato de tela, UX após erro ou cold start**. Não liberar as APKs 706/707 com base só em assinatura estática.

O manifesto público de atualização aponta versão 708, `mandatory:false`; releases disponíveis não equivalem a versões ativas. Telemetria instalada permanece desconhecida, sem autorização de consulta produtiva.

## 5. Gates pendentes e critérios de decisão

1. Native proxy + login fictício + POST financeiro realmente interceptados, com headers, body e status. Se infraestrutura bloquear, relatar como tal e não inferir resultado.
2. Repetir 409, 422 e timeout com o transporte original nativo e comparar cada `operationId` do retry manual com o original. Distinguir timeout de JS, timeout nativo e falha TLS.
3. Fazer `am force-stop` após timeout com intenção sem resposta, reiniciar a mesma APK **sem limpar dados**, observar login, armazenamento e quaisquer POSTs espontâneos, e conferir a identidade caso exista recuperação manual.
4. Executar gate equivalente ou inventário conservador 706/707, sem presumir cobertura de outras versões ativas.
5. Somente após esses testes, elaborar contrato de compatibilidade. Não responder 200 com `pending:true`, não deduplicar por semelhança monetária, não modificar escritores sem solução comprovada.

**Estado:** Issue #699 OPEN/P0, PR #705 Draft, Etapa 10 aberta. Código/DB financeiros intactos. 


## 6. ADENDO NATIVO COMPROVADO (24/11/2026)

**Gate:** [GitHub Actions #45444361896](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45444361896), COMPLETED/SUCCESS, job `138623914915`. Android 13 AVD API33, APK 708 original com SHA fixado, `CapacitorHttpAndroidInterface.isEnabled() === true`, **sem** trocar `window.fetch` por `CapacitorWebFetch`. O tráfego HTTPS chegou ao proxy local e o POST foi encaminhado somente à API fictícia.

### Contrato nativo observado

Os três POSTs vieram da tela original Despesa com estes campos idênticos:
`description='ISSUE699 QA DESPESA FICTÍCIA'`, `type=expense`, `status=paid`, `date=2026-11-24`, `amount=12.35`, `accountId=issue699-account`, `categoryId=issue699-category`, `paymentMethodId=issue699-payment`; `operationId` único por tentativa:

1. HTTP409: `phoenix-event-abc1c2f4-5112-4dfb-986f-fa2a75bf29e9`
2. HTTP422 após retry manual: `phoenix-event-f1431f76-e910-4ec7-9ba2-6b82865039d2`
3. Resposta atrasada no mock: `phoenix-event-4e7dc2a7-6c34-4cce-bc0e-d8ac0a26a13d`

O proxy registrou `Content-Type: application/json`, esquema `Authorization: Bearer`, User-Agent Android 13 WebView e **ausência de cabeçalho Origin** na requisição nativa; o fallback browser testado anteriormente enviava `Origin: https://localhost`. Cabeçalhos efetivamente vistos, sem registrar credenciais reais.

Após HTTP409/422, a UI exibiu exatamente `Não foi possível confirmar o lançamento no servidor. Os dados foram mantidos para nova tentativa.`; o formulário permaneceu preenchido, e o botão `Salvar lançamento` continuou habilitado. Não houve reenvio espontâneo nos intervalos de 3,3s após cada rejeição. **Geração de operationId distinto em retry manual CONFIRMADA também no transporte nativo.**

### Diferença de timeout entre o JS e o CapacitorHttp Android

O código JS usa `AbortSignal.timeout(45e3)`, mas a requisição **nativa** continuou em processamento após 47 segundos. A API fictícia atrasou a resposta por cerca de 51 segundos e o aplicativo **a aceitou como sucesso**, exibindo `LANÇAMENTO SALVO`. A rotina tentou clicar em retry manual depois do intervalo, mas não havia botão disponível (`TIMEOUT_MANUAL_RETRY_CLICK=false`), precisamente porque o servidor já havia respondido com sucesso.

**Conclusão estrita:** o deadline de 45s do JavaScript não encerrou a execução de rede nativa nessa condição. **Não** está comprovado qual é o timeout máximo do CapacitorHttp nem se existe timeout nativo configurado maior. A terceira tentativa não é evidência de retry depois de timeout nativo. É evidência de sucesso após 51s em voo.

O `syntheticCommitted=1` representa apenas o marcador do servidor fictício; não houve commit PostgreSQL nem mutação de saldos. Não confundir com aprovação financeira.

### Próximo experimento e bloqueio

[Workflow cold start #45445624430](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45445624430): repetir 409/422 e manter um terceiro POST sintético sem resposta por mais de 115 segundos, observando a UI antes e depois do limite; forçar parada completa da Activity sem limpar os dados, relançar APK original, observar 8,5 segundos de POSTs espontâneos e armazenamento local. **Resultado PENDENTE nesta revisão**, não autoriza conclusão sobre recuperação ao reiniciar.

**#699 continua OPEN/P0, PR #705 Draft, sem correção de escritores financeiros ou protocolo definitivo aprovado.**


## 7. GATES COMPLEMENTARES APROVADOS: TIMEOUT, RETRY MANUAL E COLD START (24/11/2026)

**Escopo e proveniência:** APK 708 original e hash fixado, Android 13 API 33 em GitHub Actions, `CapacitorHttpAndroidInterface.isEnabled()=true` sem restaurar `window.CapacitorWebFetch`, proxy HTTPS fictício e egress público bloqueado. Apenas os scripts de QA foram modificados. Resultados abaixo não são mutações em PG17 ou produção.

### 7.1. Correção do harness de cold start

- [Run #45445624430](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45445624430): FAILURE do harness por `SyntaxError: Unexpected token 'finally'` na linha 443. Nenhum cenário funcional foi concluído nesse run.
- Commit `cef7f665a66a0ff19c70503156f324a5c2805d6b`: acrescentada uma chave de fechamento em `scripts/meg-stage10-issue699-apk708-native-coldstart.mjs`; parser JS validado antes do commit.
- [Run #45450373014](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45450373014), job `138645498710`: SUCCESS. Na terceira requisição com resposta retida, a UI ainda mostrava `Salvando lançamento… / Processando…` aos 47 s e já exibia erro com `Salvar lançamento` habilitado quando inspecionada após cerca de 126 s. Não inferir o instante exato do timeout a partir de duas observações.

**Cold start sem limpeza de dados:** `adb shell am force-stop br.com.megfinancas.app`, nova `MainActivity`, PID confirmado diferente (`2384` -> `5040` no run #45450373014), depois 8,5 s de observação. Nenhum novo `POST /finance/events`: contagem 3 -> 3. Na volta, o aplicativo mostrou login, e a sessão anterior não existia mais em `sessionStorage`. Nenhum journal de operação identificado no `localStorage` (vazio) ou no IndexedDB observado (`meg-phoenix-runtime/monthly-snapshots`, cache de leitura).

**Reautenticação pós cold start:** commit `b171b6211445af6a8a5ee5fdf4a2543e5c8c0988` acrescentou login fictício pelo formulário da APK original depois do reinício, sem trocar transporte, e assert de ausência de reenvio financeiro. [Run #45451835980](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45451835980), job `138650725003`: **SUCCESS**. Processo original `2452` -> processo novo `4925`; após 8,5 s no login e 8,5 s na Home já autenticada, continuaram exatamente 3 POSTs, sem operação espontaneamente recuperada. `localStorage` vazio, `sessionStorage` reabriu somente `meg.auth.session`, `journalPresent=false`. Marcadores:
- `ISSUE699_NATIVE_COLDSTART_NO_SPONTANEOUS_POST_8S=PASS`
- `ISSUE699_NATIVE_COLDSTART_REAUTH_HOME` com `homeVisible=true`
- `ISSUE699_NATIVE_COLDSTART_NO_SPONTANEOUS_POST_AFTER_REAUTH=PASS`
- `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS`
- `ISSUE699_APK708_ORIGINAL_PROBE_ERRORS=[]`

**Limite:** a conclusão é restrita às janelas efetivamente observadas. Não prova inexistência de recuperação manual, por outras ações ou em prazos posteriores.

### 7.2. Retry manual **depois** de timeout no CapacitorHttp original

Commit `a6118db1d48551a275f24030b63646a453cdbd4e` estendeu o atraso de resposta no mock do harness nativo e passou a exigir erro da UI, botão habilitado, clique manual e comparação dos quatro `operationId` efetivamente capturados no `POST /finance/events`.

[Run #45452026542](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45452026542), job `138651391697`, **COMPLETED/SUCCESS**:
- `ISSUE699_APK708_NATIVE_TIMEOUT_AFTER_126S={"errorVisible":true,"saveEnabled":true,"processing":false}`.
- `ISSUE699_APK708_RECONNECT_AUTO_RETRY_WINDOW={"before":3,"after":3,"seconds":6.5}`.
- `ISSUE699_APK708_TIMEOUT_MANUAL_RETRY_CLICK=true`.
- Terceira tentativa com timeout: `phoenix-event-119950db-d6e9-4066-a6d9-13421568075b`.
- Quarta tentativa manual com campos financeiros iguais: `phoenix-event-f93949ed-db22-4532-b855-e09ad894c1eb`.
- `ISSUE699_NATIVE_LONG_TIMEOUT_MANUAL_RETRY_ID_CHANGED=PASS`.
- `ISSUE699_APK708_SYNTHETIC_COMMITTED=1` é exclusivamente contador do servidor fictício, **não** commit contábil em banco.
- `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS`, `ISSUE699_APK708_ORIGINAL_PROBE_ERRORS=[]`.

**Conclusão:** no transporte nativo real da APK 708, o timeout do `AbortSignal.timeout(45e3)` do JS **não interrompe** a requisição aos 45 s (resposta anterior aos ~51 s chegou como sucesso). O cliente mostrou erro em observação posterior, antes do segundo minuto e meio, e permitiu retry manual usando um **novo** `operationId` para a mesma intenção. O comportamento de risco verificado no fallback **também se reproduz nativamente**. A diferença de headers permanece: o POST nativo traz `Content-Type: application/json`, esquema `Authorization: Bearer` e não traz `Origin`; o fallback observado traz `Origin: https://localhost`.

### 7.3. Inventário conservador 706/707 e restrições

A inspeção binária anterior permanece a evidência disponível para 706/707: `CapacitorHttp.enabled=true`, `native-bridge.js` igual ao da 708, JS com deadline de 45 s e rota `/finance/events`. **Risco análogo plausível, não homologação dinâmica dessas versões**. Número de aparelhos ativos por versão desconhecido. A opção pública de atualização `mandatory:false` não garante substituição das APKs legadas.

**Status de encerramento:** as três lacunas solicitadas receberam evidência compatível com seus limites (transporte nativo, cold start incluindo reautenticação, inventário estático 706/707). **Não há autorização implícita para protocolo ou deploy**. Issue #699 segue OPEN/P0 e PR #705 Draft até que a política de compatibilidade e seus gates próprios sejam definidos e aprovados. API financeira, escritores, Android estável, produção e bancos protegidos intactos; nenhum merge/deploy.
