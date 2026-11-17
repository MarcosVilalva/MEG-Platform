# MEG Web Evolution | Etapa 10 | APK publicada versus Android efetivamente instalado
**Data:** 17/11/2026. **Bloqueio:** [issue #699](https://github.com/MarcosVilalva/MEG-Platform/issues/699). **PR:** #697 Draft. Sem alteração da APK, API, Render ou dados reais.

## Distinções com suporte em evidências

**Artefato publicado:** a Release `android-latest` contém `MEG-Financas-708.apk`, 6.715.918 bytes, SHA-256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`, versão `2.0.708`, pacote `br.com.megfinancas.app`. Inspeção estática por `scripts/meg-stage10-apk-release-readonly-audit.py` somente no GitHub Actions, sem instalar ou executar a APK:
- `assets/capacitor.config.json`: sem configuração `server.url` remota. O pacote incorpora JS/CSS Web localmente, com bridge Capacitor.
- Host `meg-platform-api.onrender.com` encontrado nos assets.
- O bundle `assets/public/assets/main-DdqA3NCE.js` contém os marcadores `app-state`, `PATCH` e `409`.
- O único padrão de comparação literal `.status===409` identificado no bundle aparece no fluxo que retorna objeto `{preference: ..., synced: ...}`, com retry limitado, **aparentemente sincronização de preferências**. Não está demonstrado que seja o tratamento de erro do outbox financeiro.
- A string literal `app-state/transactions` não foi localizada nos assets JS examinados, o que não prova ausência da rota, já que chamadas podem concatenar strings ou usar outro caminho.

**Evidência:** [CI #44103544308](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44103544308) **SUCCESS** no commit `1b1f4d3721517d6e6ca13172ef600fce20f5505a`, após inspeção com hash do APK fixado e remoção de trechos de string/URL da saída de log. [CI #44103051384](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44103051384) SUCCESS nos marcadores sintáticos.

**Última instalação expressamente confirmada em conversa anterior:** versão `1.1.167` em **26/08/2026**, conforme histórico do usuário. Esse registro é mais antigo que a publicação da 2.0.708, e **não comprova qual versão está instalada hoje**. Não encontramos confirmação posterior de atualização nem extração do dispositivo. O código `apps/web/src/instant-persistence.js` foi introduzido em 29/08/2026 no GitHub e evoluiu até setembro; não é seguro atribuir o contrato posterior à versão 1.1.167 sem comprovar o bundle correspondente.

## Consequência técnica para o P0

O teste executável de `ensureOutboxConfirmed` extraído do código legível atual `apps/web/src/instant-persistence.js` continua válido para **aquele código** e mostra retry permanente de 409, sem ler `retryable:false`. Isso é risco concreto para um cliente que efetivamente contenha tal código, mas **não constitui prova de que o aparelho do usuário ou a APK 2.0.708 utilizem o mesmo ramo financeiro**.

As duas APIs Fastify/Prisma isoladas em PG17 QA e os testes de concorrência 200/409 também são válidos, mas não homologam a APK física. A implantação no endpoint compartilhado que o APK publicado referencia continuaria arriscada, inclusive porque `render.yaml` tem build e auto deploy sobre serviços produtivos.

## Próximo gate verificável, antes de produção

1. Recuperar **por evidência do dispositivo** a versão/código do aplicativo instalado, sem atualizar nem modificar o Android. Não usar 1.1.167 ou 2.0.708 por suposição.
2. Observar o protocolo de gravação financeira efetivamente utilizado por esse build contra QA isolado, inclusive offline, restore intencional, replay tardio, dois dispositivos e recebimento de conflito permanente.
3. Não confundir mecanismo de retry de **preferências** do JS compilado com retry de **transação financeira**.
4. Apenas depois de confirmar compatibilidade, definir cutover de autoridade financeira e recuperação atômica. Não aceitar sucesso falso 200, alteração de `FinancialEvent.id`, reativação implícita de arquivado ou perda de outbox.
5. Aprovação técnica e funcional específica antes de merge/deploy. Nenhum link de prévia publicada existe nesta entrega.

**Marco 5 permanece P0 bloqueado.** Indicador 40% técnico, 0% de migração real.

## Diagnóstico de versão instalada preparado, não executado

O script `scripts/meg-stage10-android-instalado-versao-readonly.ps1` utiliza somente `adb devices` e `adb shell dumpsys package br.com.megfinancas.app`. Valida que haja exatamente um aparelho Android autorizado e imprime apenas versão, código e datas, sem alterar aplicativo, acessar dados MEG ou chamar a API. **Não houve execução em aparelho real**, logo a versão atual do usuário segue desconhecida. A existência desse script não libera o P0.
