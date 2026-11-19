# Etapa 10 | Gate 1: comparacao privada de fingerprints A/B/C (offline)

Data: 19/11/2026. Base de codigo: PR #701 em Draft, commit `1b3b256a38712a40600d39f22aada139b95b6b46`. Branch isolada `stage10/lote03-private-fingerprint-gate1-20261119`, **sem PR, merge ou deploy**.

## Resultado efetivamente obtido

- O arquivo `scripts/meg-stage10-lote03-private-fingerprint-compare.mjs` foi criado. Ele **nao acessa banco nem rede, nao grava arquivos** e recebe dois conjuntos de fingerprints somente por stdin local.
- O teste `scripts/meg-stage10-lote03-private-fingerprint-compare.test.mjs` passou com **5/5 testes sintéticos** em Node v22.16.0 num ambiente sem conexao com banco privado. Um caso sintético de uso local retornou `MEG_STAGE10_LOTE03_PRIVATE_GATE1=PASS`. Isso **nao e a comparacao dos tres IDs verdadeiros**.
- O codigo versionado foi conferido por blob SHA contra os dois arquivos realmente testados localmente: `c25565849aea7bdf58808c00dbd1a92b9a032ed0` e `497ed5c32875874ca8046afa5ee536e980d533e0`. Nenhum workflow GitHub foi acionado nesta preparacao.
- Falha fechada se executar sem `MEG_STAGE10_PRIVATE_OFFLINE_ACK=1`, se `CI=true` ou `GITHUB_ACTIONS=true`, se faltar algum padrao A/B/C, se houver duplicidade, campos extras ou nao autorizados, se elegibilidade for diferente de PASS, se as sete contagens nao forem 1/1/1/0/0/0/0, ou se qualquer um dos cinco fingerprints de cada padrao divergir. Codigo de saida 3 para bloqueio.
- A saida do utilitario contem apenas PASS/BLOCKED, codigo fixo do motivo, padrao e nome de campo quando divergentes. **Nunca emite IDs, valores, nomes, descricoes ou hashes**.

## Origem e formato estritamente privado

A autoridade historica existente e `scripts/meg-stage10-lote03-fingerprint.readonly.psql`, que exige banco `meg_stage10_qa`, role `m_vil`, socket local, porta 5448, transacao `READ ONLY` e tres IDs privados por parametros. **Esse script NAO foi executado nesta rodada.** Os dados correntes de referencia precisariam ser obtidos pela consulta equivalente, exclusivamente SELECT e mediante autorizacao propria.

O comparador espera **um unico JSON privado, somente na maquina autorizada**, com exatamente as chaves de nivel superior `current` (referencia atual) e `local` (backup historico), ambas listas de exatamente tres objetos rotulados `A`, `B` e `C`. Cada objeto aceita somente as colunas do PSQL versionado:
- `padrao`, `elegibilidade`;
- `categorias_unicas`, `meios_unicos`, `espelhos_exatos`, `ledger`, `recibos`, `baixas`, `importacoes`;
- `event_fingerprint`, `account_fingerprint`, `category_fingerprint`, `payment_fingerprint`, `source_fingerprint`.

Nao versionar nem anexar esse JSON, transcricoes SQL, saidas de PSQL, hashes ou IDs. Nao passar JSON privado em argumento de linha de comando, historico PowerShell, issue, commit, Actions ou chat. O comparador roda estritamente com stdin local, sem uploads. Um operador autorizado precisa garantir que as duas leituras correspondam aos mesmos IDs atuais e que a referencia seja recente.

## Limites, bloqueios e gates subsequentes

**Gate 1 REAL = NAO EXECUTADO.** O backup WSL anteriormente mencionado nao esta acessivel/verificado neste contexto; sua disponibilidade e atualidade continuam inconclusivas. Nao houve contato com Supabase produtivo, PostgreSQL Windows/WSL, Render, Android, dados reais, backup, restauracao nem transacao financeira nesta rodada.

Os hashes do SQL sao **MD5 para comparacao operacional**, nao assinatura criptografica, atestado de origem, backup nem prova de igualdade de toda a base; o fingerprint do evento exclui `updatedAt`, deliberadamente. O comparador valida apenas o conjunto de cinco fingerprints e contagens por padrao. Mesmo um PASS real dependeria de autorizacao e das outras verificacoes do plano `docs/MEG-STAGE10-PLANO-LOTE03-PRIVADO-20261118.md`.

**Proximo bloqueio objetivo:** disponibilizar de forma **local e autorizada** duas leituras equivalentes dos tres registros verdadeiros e seus cinco fingerprints; comparar somente em ambiente privado. Ate la, nenhum dado real deve ser transferido ao GitHub e nenhuma QA gravavel deve ser criada. Gates 2-5, replica privada fiel, backup atual restauravel, rollback pos-commit, Web/Android e liberacao de producao continuam pendentes e dependem de autorizacao e prova separadas. PRs #701 e #702 Draft; etapa 11 proibida.
