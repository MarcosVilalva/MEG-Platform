# MEG Stage 10 | Protocolo da APK Android 2.0.708 | Evidencias 17/11/2026

## Escopo e fonte

PR #697 Draft, branch QA. Fonte de verdade para APK publicada: `https://github.com/MarcosVilalva/MEG-Platform/releases/download/android-latest/MEG-Financas-708.apk`, auditada em GitHub Actions somente leitura, SHA256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`, pacote `br.com.megfinancas.app`, versionName `2.0.708`, versionCode `708`.

**A APK instalada no aparelho foi identificada pelo usuario apenas com os metadados ADB (2.0.708/708). Nao se inferiu hash da instalacao.**

## 1. Fingerprint estatico do APK publicado

[Actions #44210176996](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44210176996) SUCCESS, 15 assets Web inspecionados. Os literais da rota `app-state/transactions`, chaves de outbox `meg-cloud-transaction-outbox-v1`, `meg-cloud-transaction-outbox-conflict-v1`, `meg-cloud-state-properties-outbox-v1`, e `megCloudConfirmation` **NAO foram encontrados**. Aparecem `app-state`, `expectedRevision`, `operationId`, `PUT`, `PATCH` e `409`, sem prova de que pertençam ao mesmo fluxo.

Isso impede extrapolar o bug do `instant-persistence.js` (fonte de desenvolvimento) para a APK 2.0.708 sem caracterizar seu bundle real. O fingerprint e um teste de literais exatos, nao uma analise completa de JavaScript dinamico nem uma execucao em Android.

## 2. Protecao canônica no API QA para clientes de estado completo

Adicionada regressao em `apps/api/src/modules/finance/stage10-saneamento-routes.isolated.test.ts`. No PostgreSQL 17 isolado, uma tentativa `PUT /app-state` de reintroduzir um `FinancialEvent` arquivado e rejeitada com HTTP 409 `NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE`, `retryable:false`, sem reverter o tombstone ou mudar o AppState. O `PATCH /app-state/transactions` e o restore autenticado separado continuam protegidos. [Actions #44210739918](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44210739918) SUCCESS.

**Limite:** nao significa que a APK 2.0.708 chame essa rota, nem que interprete o 409 corretamente. Compatibilidade #699 segue sem homologacao funcional no aparelho.

## 3. Comparar binario instalado sem extrair APK

Novo script `scripts/meg-stage10-android-apk-hash-readonly.ps1` usa exclusivamente `adb devices`, `adb shell pm path` e `adb shell sha256sum`. Nao executa app, nao modifica conteudo ou configuracao, nao faz `adb pull`, nao copia dados financeiros. Se o pacote usar split APK, devolve `SPLIT_APK_HASH_NAO_COMPARAVEL`, sem conclusao falsa. O SHA esperado e fixo conforme auditoria da release. O operador devera executar no PowerShell 5.1 com depuracao USB autorizada.

Parser do script e respostas ADB ficticias, com hashes iguais/diferentes, aprovados em [Actions #44211331939](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44211331939). **A versao instalada ainda nao teve SHA conferido.**

## 4. Gate atual

Sem producao, Android alterado, merge, novos custos, etapa 11 nem saneamento DML. Aguardar fingerprint instalado, caracterizacao offline/409, plano de seguranca da issue #691 e classificacao historica da #700. Indicador de saneamento **50% tecnico (5/10), 0% produtivo**.

## 18/11/2026 | Igualdade binaria da APK instalada confirmada por relatorio do operador

O operador executou no aparelho conectado por ADB o script READ_ONLY previamente ensaiado com respostas ficticias em CI, retornando `STATUS=HASH_IGUAL_A_RELEASE`, `MESMO_BINARIO_DA_RELEASE=SIM`, pacote `br.com.megfinancas.app`, `DADOS_FINANCEIROS_EXTRAIDOS=NAO`, `APK_INSTALADA_OU_ALTERADA=NAO`. O SHA-256 de ambos (instalado e release) foi `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`.

**Status corrigido:** a equivalencia de binario nao esta mais pendente. A conclusao se refere ao arquivo APK de instalacao unica, nao a execucao dos fluxos. Os resultados estaticos dos literais presentes/ausentes no release auditado agora se referem ao mesmo binario que o operador informou como instalado. Ainda nao foi verificado o comportamento do cliente quando offline, o protocolo HTTP efetivamente chamado, nem como reage a 409, tombstones ou restauracao. Issue #699 continua aberta.
