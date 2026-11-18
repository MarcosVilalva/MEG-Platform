# MEG Finanças Web Evolution | Etapa 10 | Protocolo de homologação do reenvio no Android QA

**Data:** 18/11/2026  
**Estado:** PREPARADO, NÃO EXECUTADO EM APARELHO FÍSICO  
**Escopo:** PR #701 Draft, referência do PR #697, com API candidata do PR #702 avaliada separadamente. Issue P0 #699.

## 1. Premissas obrigatórias

- O Android estável `br.com.megfinancas.app`, versão 2.0.708 e SHA-256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`, permanece intocado. A variante de QA usa **outro** pacote: `br.com.megfinancas.app.stage10qa` e assinatura de debug.
- A variante opt-in aponta somente para `http://127.0.0.1:3333`, acessado no aparelho via `adb reverse tcp:3333 tcp:3333`. **Nenhum domínio de produção ou credencial real** pode ser usado.
- O servidor de QA deve estar isolado em banco PostgreSQL 17 **descartável**, com titular, categorias, conta monetária, Conta Benefício, Verocard e saldo **fictícios**, sem conexão com o Supabase ou Render de produção. Não reutilizar backup real como fixture.
- Bloqueio de publicação: `node scripts/npm-security-audit.mjs --audit-level=high` sobre o inventário completo deve passar, além de build, testes financeiros e integridade do artefato. Não emitir APK distribuível enquanto o alerta `picomatch` persistir. Não reduzir a severidade ou ignorar GHSA-fc5q-39xc-vjpf.
- O workflow `.github/workflows/meg-stage10-android-confirmacao-qa.yml` coloca a auditoria antes de `upload-artifact`. O último ensaio em emulador provou apenas inicialização, WebView e requisição de login rejeitada. **Não** prova reenvio no aparelho.
- Proibidos: alterar a APK estável, publicar OTA, conectar a produção, tocar em dados reais, fazer merge, deploy ou piloto sem gates e autorizações próprias.

## 2. Pré-requisitos de evidência antes de instalar

1. CI completo da variante QA aprovado, com relatório de segurança sem alto/crítico e artefato disponível para download; registrar run, commit, SHA-256, nome do pacote, `versionCode` e certificado de **debug**.
2. Banco QA e API local preparados com usuário fictício e endpoints reais do contrato Phoenix. Verificar `/ready` e JWT no **servidor local**, nunca usar dados produtivos.
3. A ferramenta de injeção local `scripts/meg-stage10-qa-fault-proxy.mjs` encaminha o POST a uma API em `127.0.0.1:3334`, aguarda o HTTP 2xx e descarta **uma única resposta** antes de entregá-la ao Android. O contrato sintético `scripts/meg-stage10-qa-fault-proxy.test.mjs` passou (3/3) com backend HTTP fictício; **a integração com a API PostgreSQL 17 e o aparelho físico ainda não ocorreu**. A ferramenta só inicia com `MEG_STAGE10_ISOLATED_PG=1` e `MEG_STAGE10_QA_LOCAL_ONLY=1`.
4. Preparar consulta somente leitura de `FinancialEvent`, `LedgerEntry`, identificador da tentativa (`operationId`) e saldo derivado do writer canônico, escopada ao titular fictício. Gerar baseline antes de cada cenário.
5. Confirmar que o telefone selecionado por ADB é o esperado. Não executar comandos de limpeza, desinstalação ou reinicialização de dados de aplicativos.

## 3. Simulação local de perda de resposta (somente após os gates)

A API com banco QA exclusivamente fictício deve escutar em `127.0.0.1:3334`, e o proxy em `127.0.0.1:3333`. Inicie o proxy em PowerShell separado:

```powershell
$env:MEG_STAGE10_ISOLATED_PG = '1'
$env:MEG_STAGE10_QA_LOCAL_ONLY = '1'
$env:MEG_STAGE10_QA_DROP_PATH = '/finance/events'
node scripts/meg-stage10-qa-fault-proxy.mjs
```

Para o caso de benefício, interrompa o proxy e inicie novamente com `MEG_STAGE10_QA_DROP_PATH='/finance/benefit-events'`. A falha é consumida apenas após a primeira resposta 2xx no endpoint escolhido; rejeições 4xx são encaminhadas ao cliente. Guarde o marcador `QA_FAULT_DROP_AFTER_COMMIT` sem registrar corpo ou JWT. O script nunca deve encaminhar para endereço não local. Executar `node --test scripts/meg-stage10-qa-fault-proxy.test.mjs` verifica apenas o contrato do proxy, não o cenário fim a fim financeiro.

## 4. Conexão no Windows PowerShell (somente após os gates)

```powershell
$ErrorActionPreference = 'Stop'
adb devices -l
adb reverse tcp:3333 tcp:3333
adb reverse --list
adb shell pm list packages | Select-String 'br.com.megfinancas.app'
```

Guardar a saída dos comandos como evidência. Ela deve mostrar a regra `tcp:3333` e os pacotes distintos. A instalação da variante `stage10qa` só é permitida após SHA e assinatura conferidos com o artefato aprovado, em caminho local explicitamente selecionado pelo operador. Não instalar artefatos obtidos de jobs cuja auditoria falhou.

## 5. Matriz de homologação (não executada)

| Caso | Ação no aplicativo de QA | Evidência obrigatória no servidor fictício | Resultado exigido |
| --- | --- | --- | --- |
| A. Sucesso normal, despesa | Criar despesa fictícia via Novo Lançamento e aguardar releitura | Um `FinancialEvent` e um `LedgerEntry`, mesmo ID após releitura | HTTP aceito não vira `PHOENIX_WRITE_NOT_CONFIRMED`; interface confirma sem novo POST |
| B. Perda de resposta após commit, despesa | Criar, cortar resposta **depois** do commit, tentar confirmar, fechar/reabrir drawer e reiniciar aplicativo | Mesmo `operationId` na repetição do mesmo payload, mesmo ID de evento, uma entrada de ledger e valor original | Nenhuma duplicidade, nenhuma nova chave ao reabrir para a mesma tentativa |
| C. Sucesso/reenvio de benefício | Repetir A e B usando Conta Benefício + Verocard com dados fictícios | Um evento de benefício e um lançamento contábil correspondente por tentativa; conta monetária principal intacta | Sem confundir benefício com cartão de crédito ou dinheiro comum |
| D. Conflito transitório | Simular conflito de revisão resolúvel, mantendo payload/usuário | Registro sem duplicação; identificador de tentativa retido | Retry controlado e mensagem coerente |
| E. Rejeição definitiva | Enviar caso financeiro inválido validado pelo domínio, sem commit | Nenhum evento nem ledger criado | Rejeição clara, sem retry infinito ou sucesso falso |
| F. Isolamento de titulares | Alternar entre dois usuários **fictícios** com tentativas distintas | Nenhum `operationId` e vínculo compartilhado entre titulares | Isolamento mantido e acesso negado a IDs de outro titular |
| G. Ciclo de vida | Suspender e retomar app, reabrir drawer e testar nova sessão | Preservação da chave apenas para a mesma intenção; sem reaproveitar para payload diferente | Reenvio idempotente sem misturar operações |

**Atenção:** uma tentativa aprovada não comprova todas as demais. Cada caso exige registro separado de resultados e artefatos. Para cada cenário, registrar payload sintético sem credenciais, hash/ID de operação, status HTTP, contagens de eventos e ledger, IDs persistidos, saldos antes/depois e comportamento visual. Valores reais, JWTs, senhas e cookies nunca entram no relatório.

## 6. Gates de saída

- Segurança de dependências geral verde, sem exceção, e CI técnico aplicável verde.
- APK QA aprovada, hash e assinatura conferidos; Android estável ainda instalado e inalterado.
- Todos os cenários exigidos executados no aparelho físico com dados fictícios e evidências reproduzíveis. Comparar com testes já caracterizados, sem repeti-los sem necessidade.
- Reconciliação pelo writer canônico, status, competência e saldo; `operationId` persistente apenas para mesma intenção.
- Validação funcional e visual explícitas do operador. Um run em emulador não substitui homologação física.
- Separadamente, compatibilidade da API de release, reversão operacional no Render, gates de merge e autorização do piloto por ID. **Nenhuma mutação produtiva é autorizada por este documento.**

## 7. Estado e próximo passo

No momento do preparo, o npm publica `picomatch@4.0.7` como versão mais recente, ainda atingida por GHSA-fc5q-39xc-vjpf. A versão travada no monorepo é `4.0.4`, exigida por `vite@6.4.4` e `tinyglobby@0.2.17`. Não existe correção publicada e verificada para aplicar com segurança. O PR upstream micromatch/picomatch#238 é proposta **aberta**, não release, e não pode ser usado como prova de remediação.

**Próximo passo real:** quando existir versão oficial corrigida ou substituição comprovada e compatível, atualizar lock e testar o gate integral; publicar somente o artefato QA aprovado e então executar este roteiro em aparelho com API/banco fictícios. O proxy já passou tanto no teste sintético quanto no ensaio com API real JWT/PG17 descartável; a prova do comportamento no aparelho físico ainda é gate obrigatório. Manter PR #701 e PR #702 Draft, sem produção e sem Etapa 11.

## 8. Gate remoto HTTP real com PostgreSQL 17 (18/11/2026)

- Script novo: `apps/api/src/modules/finance/stage10-qa-fault-proxy.pg17.isolated.test.ts`.
- Workflow novo: `.github/workflows/meg-stage10-qa-fault-proxy-pg17.yml`, PostgreSQL 17 descartável (`meg_stage10_sandbox`, `meg_stage10_ci`), HTTP local, autenticação JWT real e writers financeiros de QA. Não gera APK nem faz deploy.
- Primeira execução [#44312619314](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44312619314): **FAIL** após o caso monetário passar. A fixture chamou o método de pagamento de `Verocard QA`, mas a política canônica `isBenefitPaymentMethod` exige exatamente `VEROCARD`. Foi erro do teste, não da regra. A fixture foi alinhada à política existente e o teste passou a emitir diagnóstico se o proxy não descartar a resposta.
- Execução definitiva [#44313109927](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44313109927): **SUCCESS**, commit de teste `3c4c8d2ae87c67208b08303538390af7bcb15bf4`. Marcadores `MEG_STAGE10_QA_PG17_FAULT_PROXY_MONETARY=PASS`, `MEG_STAGE10_QA_PG17_FAULT_PROXY_BENEFIT=PASS`, `MEG_STAGE10_QA_PG17_FAULT_PROXY_FINANCIAL_ISOLATION=PASS`. O proxy descartou uma resposta HTTP 2xx de cada writer após persistência, e o replay da mesma chave retornou o mesmo ID, com um `FinancialEvent` e um `LedgerEntry` por operação.
- Contrato sintético independente [#44313110132](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44313110132): **SUCCESS**.
- **Limite da prova:** CI em Linux e API local. Não comprova persistência do `operationId` no WebView após matar aplicativo, não equivale a teste físico do Android e não libera o gate geral de dependências. Nenhum dado real foi utilizado ou alterado.

## 9. P0 409 do cliente legado: correção restrita à fonte de QA

**Data: 18/11/2026.** A branch `stage10/android-confirmacao-qa-20261118` contém uma correção adicional apenas no código-fonte QA. **Não altera a APK estável 2.0.708 já instalada e não autoriza deploy.**

### Código corrigido

- `apps/web/src/cloud-outbox-conflict-policy.js`: somente `STATE_CONFLICT`, `NORMALIZATION_REVISION_CONFLICT` e `NORMALIZATION_CONCURRENT_EVENT_CHANGE` (quando não recusado explicitamente) permitem retry após nova leitura. Qualquer 409 permanente, desconhecido ou com `retryable:false` fica **estacionado**. Mesmo sem JSON válido, o erro recebe o código interno `HTTP_409_UNKNOWN_CONFLICT`, sem sucesso artificial.
- `apps/web/src/instant-persistence.js`: uma nova captura **idêntica** da mesma operação não modifica a geração nem recria `operationId`; payload efetivamente diferente inicia nova intenção. A resposta definitiva continua preservando a outbox, o marcador de conflito e o bloqueio visual para resolução, sem agendamento automático de retries.
- `apps/web/src/stage10-frozen-legacy-409-harness.test.js`: extrai as funções reais do módulo, exercitando com fixture 409, repetição, falta de resposta pós-commit, mesmo `operationId` após recarga e payload alterado. O servidor e o armazenamento são **simulados**, sem base de dados.
- Workflow `.github/workflows/meg-stage10-legacy-outbox-409-qa.yml`, com Node 22, sem npm install, sem banco e sem APK, executa somente o contrato novo. [GitHub Actions #44381042535](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44381042535) **SUCCESS**, commit `c5bcea9b6074d51bba6a4c37c0b4d79738f933f4`. Log: `MEG_STAGE10_UNKNOWN_409_FAIL_CLOSED_AND_OPERATION_ID=PASS`; `MEG_STAGE10_POST_COMMIT_LOST_RESPONSE_NO_DUPLICATE=PASS`; `MEG_STAGE10_SAME_INTENT_STABLE_OPERATION_ID=PASS`.
- `scripts/meg-stage10-api-client-409-contract.mjs` cruza **10 códigos** do contrato da API no SHA imutável do PR #702 (`19aaa96b508f3d4db2a38ef0866ca5622b377200`) com as respostas do cliente QA. Workflow `.github/workflows/meg-stage10-api702-client409-contract.yml`, [GitHub Actions #44381526838](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44381526838), **SUCCESS**, marcador `MEG_STAGE10_API_702_CLIENT_409_CONTRACT=PASS`. Não mudou PR #702.
- Issue [#699](https://github.com/MarcosVilalva/MEG-Platform/issues/699) recebeu evidência técnica e permanece **aberta**. A variante QA atual não foi recompilada após esta correção; o run anterior de APK [#44377486060](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44377486060) foi anterior ao novo código e não comprova execução deste patch no WebView.

### Limites e próximos gates

**Proteção da API:** o PR #702 preserva identidade, rejeita mudanças inválidas e tem CI específico e geral já aprovados, mas não foi publicado. A APK estável instalada continua executando sua versão anterior do cliente. A mudança QA não corrige retroativamente esse binário: não liberar a nova API até comprovar compatibilidade com clientes instalados ou obter autorização específica para atualização/canal de compatibilidade. Não trocar erro financeiro verdadeiro por HTTP 200 falso nem remover `retryable:false`.

**Réplica privada fiel:** inventário read-only de `pg_constraint` na produção identificou relações diretas de `FinancialEvent` a `Account`, `Category`, `PaymentMethod`, `User` e `Workspace`, e dependentes `LedgerEntry`, `ImportedRow`, `Receipt`, `PayablePayment`, além do `AppState` legado por `Workspace`. A origem real foi apenas **lida**. A cópia QA dos três registros com os IDs/valores originais não existe; falta um destino PostgreSQL 17 privado com caminho de transferência autenticado, sem logs/artefatos públicos. Nenhum recurso pago ou sandbox Stage09 foi usado como destino.

**Recuperação:** backup íntegro/restaurável **atual** e reversão pós-vínculo real permanecem não comprovados, assim como homologação funcional em aparelho físico e aprovação visual. Proibidos `UPDATE` produtivo, merge, deploy, modificação do Android congelado e Etapa 11.
