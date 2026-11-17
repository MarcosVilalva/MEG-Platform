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
