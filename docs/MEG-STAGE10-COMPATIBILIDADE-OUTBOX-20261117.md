# MEG Web Evolution | Etapa 10 | Compatibilidade de conflitos e outbox
**Data:** 17/11/2026  
**Issue:** #699 (P0)  
**PR:** #697 Draft, baseado no PR #696 Draft  
**Ambiente:** testes exclusivos em PostgreSQL 17 descartável e código novo Web-only na branch QA

## 1. Evidência confirmada

O aplicativo legado utiliza `apps/web/src/instant-persistence.js`. Em `ensureOutboxConfirmed`, uma resposta HTTP **409** da rota `PATCH /app-state/transactions` executa `continue` indiscriminadamente. Quando não há confirmação, `flushImmediateSave` e `scheduleOutboxRetry` continuam tentando, mantendo a operação protegida no outbox. O mesmo cliente gera `deletes` e `upserts` com a **mesma chave legada** em exclusão e posterior reinserção, conforme `legacy-state-patch.js` e `cloud-write-ahead-core.js`.

O sincronizador da API, agora protegido na branch QA, recusa a reinserção implícita de um evento arquivado com `NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE`, e rejeita alterações que comprometam vínculos canônicos. Não pode simplesmente responder sucesso quando a operação foi rejeitada, pois o cliente eliminaria seu outbox sem que a gravação estivesse confirmada.

### Limite de causalidade do protocolo atual
O PATCH legado contém `operationId`, `expectedRevision`, `upserts`/`deletes` e dados. Antes de cada tentativa, o cliente relê a revisão remota. Ele **não transmite prova criptográfica ou vínculo obrigatório** ao ato original de arquivamento que permita distinguir, para a mesma ID, uma recuperação deliberada de uma repetição atrasada de outro aparelho. Somente `operationId` único e revisão atualizada não provam intenção de restaurar. Portanto, não é seguro autorizar restauração por simples presença do registro em `upserts`.

## 2. Proteção implementada em QA nesta revisão

- `apps/api/src/modules/app-state/normalization-conflict-policy.ts`: classifica códigos de integridade. A API mantém HTTP 409 e passa a acrescentar **`retryable:false`** para rejeições permanentes. Para `NORMALIZATION_CONCURRENT_EVENT_CHANGE` fornece `retryable:true`. Status `STATE_CONFLICT` permanece suportado pelo protocolo existente.
- `apps/api/src/modules/app-state/routes.ts`: usa o classificador exclusivamente nas respostas de erro da sincronização, com alteração **aditiva** de payload, sem mudar autorização ou executar atualização nova.
- `apps/web/src/meg-web-evolution/qa/stage10-write-conflict-policy.ts`: helper **isolado da nova Web**, ainda não conectado a um writer produtivo, que diferencia conflitos de revisão, integridade permanente, falta de resposta e sucesso HTTP. Limita tentativas de revisão a **três por fluxo**, nunca transforma 409 permanente em sucesso e **sempre mantém o outbox** até verificação canônica do recibo.
- `apps/web/src/meg-web-evolution/qa/stage10-write-conflict-policy.test.ts`: cobertura de status, códigos conhecidos, erro não confiável que reivindica retryable, tentativa excedida e preservação do outbox.
- `apps/api/src/modules/finance/stage10-saneamento-routes.isolated.test.ts`: asserts HTTP de que categoria incompatível, referência de ledger e reinserção arquivada geram `retryable:false`, sem gravação silenciosa.

**Não modificados:** `apps/web/src/instant-persistence.js`, código Android/Capacitor, serviço Render, Supabase, banco real e `main`.

## 3. Evidência automatizada e limites

[Workflow #44082221551](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44082221551) terminou **SUCCESS**: banco PostgreSQL 17 sintético, testes HTTP Fastify com autenticação simulada, regressão financeira, políticas de conflito da nova Web, testes legados read-only e TypeScript da API.

**O CI verde NÃO prova que o Android parou de repetir 409.** Ele continua usando código anterior, que ignora o campo `retryable`. A nova função da Web também ainda não está ligada a uma interface de gravação real. Tampouco houve teste com JWT real, aparelho Android ou ambiente integrado.

## 4. Bloqueios para implantação e saneamento real

1. **Não alterar o Android.** O congelamento é explícito; nenhum JS compartilhado legado pode ser modificado como atalho.
2. **Não mudar a API compartilhada sem prova de compatibilidade.** O `apps/web/vite.config.ts` e o `render.yaml` apontam para `meg-platform-api.onrender.com` como origem padrão. O build do serviço em `render.yaml` contém `npm run db:prepare:production && npm run db:push:production` e auto deploy por commit. Um merge/deploy nessa rota pode afetar o Android e o schema produtivo. A origem efetiva de uma APK instalada ainda exige verificação separada.
3. **Não autorizar restauração automática por ID**, porque um replay atrasado pode parecer igual a um undo legítimo.
4. **Não responder 200 a erro permanente** nem descartar outbox pendente: isso falsificaria a confirmação da gravação.
5. **Não considerar resolvida a Issue #699** com simples troca de status 409 por 422, pois o cliente legado agenda retentativas em falhas diversas.
6. **Não realizar o saneamento de categorias e pagamentos reais antes de resolver a compatibilidade**, já que um writer antigo no mesmo banco poderia desfazer os vínculos.

## 5. Caminho seguro de solução

- Proteger as operações financeiras com `synchronizeNormalizedRows` corrigido em QA, sem implantar.
- Manter o cliente Android e o endpoint produtivo congelados até uma compatibilidade demonstrada ou isolamento real de API com invariantes financeiros preservados. Um simples proxy ou serviço separado **não** isola os riscos se o writer legado continuar regravando as mesmas tabelas.
- Definir e aprovar protocolo de restauração com prova de causalidade e autorização explícita, caso o requisito de reinserção precise coexistir com tombstones.
- Integrar a política Web-only apenas quando o writer da nova Web estiver autorizado e houver testes de recibo, outbox e autenticação.
- Para conclusão do **marco 5**, testar o cliente atual contra a API de destino em ambiente isolado, incluindo offline, repetição, conflito permanente, reintrodução, saldo, ledger, dois dispositivos, rollback e sem alteração do Android. Hoje o marco permanece **BLOQUEADO**.

**Indicador oficial:** 4/10 marcos, **40%** do saneamento técnico. **0%** dos dados reais migrados. Etapa 10 não concluída.


## 17/11/2026 | Distinção obrigatória do APK
A inspeção estática do APK oficial 2.0.708 no CI não comprovou que `instant-persistence.js` e o ramo de outbox financeiro sejam idênticos aos do cliente compilado. O único ramo `.status===409` encontrado é de retorno `{preference:...,synced:...}`, aparentemente preferência. A APK usa Web local embutida e host Render em seus assets. Não confundir `409` de preferência com `409` de transação. Última versão instalada explicitamente confirmada em 26/08/2026: **1.1.167**, sem confirmação de atualização posterior. Esse registro histórico NÃO demonstra a versão instalada atualmente. Provas: [CI #44103544308](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44103544308), docs/MEG-STAGE10-APK-409-CONTRATO-REAL-20261117.md. Issue #699 P0 continua aberta até homologação do contrato efetivamente instalado, sem modificar Android.


## 17/11/2026 | Correcao efetiva da sincronizacao legada autorizada

O usuario autorizou excecao limitada ao codigo do protocolo Android/legado e ao diagnostico somente leitura da versao instalada, sem permitir APK publicada, instalacao, alteracao visual, producao, merge, deploy ou custos. Esta atualizacao substitui a afirmacao historica de que instant-persistence.js permanecia intocado.

Implementacao QA commit 77e769549b685e154991eb0e99c72b2f339ff882:
- cloud-outbox-conflict-policy.js classifica respostas HTTP 409 de revisao como reexecutaveis apos releitura; conflitos permanentes e HTTP 400/403/404/422 exigem intervencao. 401/408/429/5xx continuam pendentes no protocolo de retentativa.
- instant-persistence.js agora interpreta o codigo de rejeicao, estaciona a fila inteira com marcador persistido de metadados, preserva os lancamentos e a protecao duravel, suspende timers automaticos e informa que e necessaria resolucao. Nenhum erro e convertido em sucesso.
- API de diagnostico: MEG_INSTANT_PERSISTENCE.conflict() e rechecagem iniciada explicitamente por retryBlocked(). Nenhum dado financeiro e registrado no marcador.
- O guard da CI manteve Android/Capacitor e demais JS legados congelados, liberando apenas instant-persistence.js.
- Teste de fonte stage10-frozen-legacy-409-harness.test.js atualizado, sem APK gerada.

Evidencia: GitHub Actions #44140953790 SUCCESS, 30 passos verdes. Nao houve instalacao em aparelho, migracao, deploy nem alteracao em producao.

Lacunas: a APK instalada pode nao usar este codigo; versao real desconhecida. Repeticao infinita corrigida no fonte QA nao resolve por si a restauracao legitima da mesma ID, que exige protocolo autenticado separado. Issue #699 segue P0 aberta. 40% tecnico, 0% dados reais.

## 17/11/2026 | Versao instalada declarada: 2.0.708

O usuario confirmou **2.0.708** como versao Android instalada. A correcao do outbox da branch QA ainda nao foi distribuida para este aparelho. O contrato exato do bundle instalado e o fluxo de restauracao de evento arquivado continuam sem comprovacao. A issue #699 nao esta resolvida com a declaracao da versao. Sem deploy, merge, Supabase real ou APK publicada.

## 17/11/2026 | Solucao de restore por intencao explicita implementada no codigo

Novo arquivo apps/api/src/modules/app-state/legacy-restore.ts, rotas GET/POST sob /app-state/legacy-restore/:legacyId. Rota so e registrada no PG17 descartavel, quando flags, host e usuario coincidirem; ADMIN e assertWorkspaceWriteAccess. Requer eventId, operationId UUID, expectedRevision, expectedArchivedAt, expectedUpdatedAt e confirmacao literal, portanto o PATCH antigo nao pode desencadear restore.

O writer utiliza transacao SERIALIZABLE, compare-and-swap do tombstone, syncLedger financeiro existente, writeBackNormalizedEventsToAppState e AuditLog/CloudMutationReceipt para idempotencia. Preserva id, categoria, metodo, competencia, tipo, status e valor. Rejeita status archived sem proveniencia original, beneficios, Verocard, credito/cartao, dominio vinculado e conta invalida; nao adivinha regras antigas.

[Actions #44145843511](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44145843511) SUCCESS no SHA 02f9ed64421627b3094947243bd1de256cd04c91. Execucao isolada de fixtures PG17, autenticao simulada; nao e homologacao de JWT ou Android 2.0.708. O commit anterior c3a2ffa executou assercoes com PASS, mas o workflow #44145704517 falhou apenas na limpeza da fixture de ledger, corrigida antes do CI verde. Detalhes docs/MEG-STAGE10-RESTORE-EXPLICITO-QA-20261117.md.

Issue #699 P0 ainda aberta. O novo endpoint nao existe em producao, nao deve ser ativado sem autorizacao independente, e a nova Web ainda nao envia restore real.

## 17/11/2026 | RETIFICACAO baseada na APK publica 2.0.708 e no PUT de estado completo

A afirmacao de que o Android fisico 2.0.708 usa o fluxo `ensureOutboxConfirmed` de `apps/web/src/instant-persistence.js` **nao foi demonstrada**. O defeito do fonte QA permanece valido nesse fonte, mas nao se deve assumir sua inclusao na APK ja instalada.

[Actions #44210176996](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44210176996) SUCCESS, fingerprint estatico do APK PUBLICO de codigo 708 (hash ancorado) verificou 15 assets Web. Ausentes literais `app-state/transactions`, `meg-cloud-transaction-outbox-v1`, `meg-cloud-transaction-outbox-conflict-v1`, `meg-cloud-state-properties-outbox-v1`, `megCloudConfirmation`. Presentes literais `app-state`, `expectedRevision`, `operationId`, `PUT`, `PATCH`, `409`. Ausencia de strings nao prova que nao exista rota calculada dinamicamente; presenca de PUT/409 nao vincula os dois ao mesmo request.

[Actions #44210739918](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44210739918) SUCCESS (PG17 ficticio), protege contra PUT de estado completo com reinsercao de ID arquivado, alem do PATCH legado; a rejeicao nao altera eventos, tombstones, ledger ou revisao. Sem homologacao real na APK.

O operador verificou pelo ADB somente versao instalada 2.0.708/code 708. Prova de igualdade binaria com a release ainda nao existe. Script `scripts/meg-stage10-android-apk-hash-readonly.ps1` faz hash remoto sem extrair APK ou dados; teste sintetico e parser PowerShell aprovados em [Actions #44211331939](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44211331939). Resultado fisico pendente. Manter issue #699 P0 ate prova de protocolo/409/offline em QA independente.
