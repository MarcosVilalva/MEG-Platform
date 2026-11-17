# MEG Etapa 10 | Integracao de criacao/edicao Web com autoridade Android | QA

**Estado em 17/11/2026:** implementacao funcional verificavel apenas em banco descartavel PostgreSQL17; PR #697 Draft. A base real compartilhada ainda nao foi saneada ou homologada. Nenhuma nova base permanente foi criada.

## Fluxo executavel
1. Em localhost DEV e com VITE_STAGE10_QA_WEB_WRITE=true, a nova Web consulta o handshake autenticado /app-state/stage10-qa-write-gate. O servidor permite essa rota somente com MEG_STAGE10_WEB_WRITE_QA=1 + MEG_STAGE10_ISOLATED_PG=1, host 127.0.0.1, usuario meg_stage10_ci e DB meg_stage10_sandbox. O handshake exige ADMIN e capacidade de escrita do workspace, e retorna revision.
2. Novo Lançamento (despesa monetaria simples) envia POST /finance/events com operationId UUID. A API financeira existente calcula e valida politica/status/saldo e grava FinancialEvent + LedgerEntry. O espelho de compatibilidade AppState recebe legacyTransactionId=FinancialEvent.id na MESMA transacao, sem gerar outro evento historico; divergencia do fingerprint reprova e reverte tudo. Regras especiais (cartao credito, beneficio, Verocard, transferencias) ficam fora.
3. Editar Lançamento usa PATCH /finance/events/:id/stage10-qa-edit com expectedUpdatedAt e expectedRevision. Somente despesas QA identificadas por sourcePayload.__megStage10QaSource=web-monetary-create-v1 podem ser editadas. Data, conta e status originais permanecem bloqueados. Writer valida categoria e metodo canonicos, calcula valor/efeitos no servidor, protege saldo futuro e faz compare-and-swap. Faz update do mesmo FinancialEvent, regenera ledger e espelho AppState na mesma transacao serializavel; grava AuditLog e recibo CloudMutationReceipt.
4. Repetir operationId com payload idêntico devolve recibo idempotente, sem duplicar evento; reutilizar com alteracao diferente devolve 409. O cliente recarrega a listagem autorizada da API depois de salvar. Erro preserva os dados no formulario.

## Evidencia
- Commit original de edicao: 6497f308eb940a12796c194b3c53d2a3e3fbdf56.
- b370edffef2ce5c64218bc61b9a1ea4d5fccf931 corrigiu GET handshake sem campo revision selecionado (CI #44177353351 falhou em TS).
- 95b80814a8f09c8afbd90ad67c932b90dbdd216d acrescentou verificacoes de edicao, replay, rollback, saldo e GET /app-state (CI #44192439644 teve testes integrados PASS e falha de tipos Web TS2345).
- 124b5224afce883e29fa8e38eeeecbcc29a75ad7 corrigiu IDs obrigatorios na Web e recarregamento apos salvar. [CI #44192824475](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44192824475) SUCCESS com PG17 descartavel e checks Web/API.
- Nenhuma evidencia de teste na APK Android 2.0.708 real, JWT REAL, browser QA vivo ou banco real. CI nao substitui homologacao.

## Gate de encerramento ainda pendente
- Validar navegador com API QA isolada e autenticacao efetiva, nao apenas Fastify.inject com identidade simulada.
- Comprovar correspondencia do protocolo da APK 2.0.708, inclusive offline, recibo, conflito permanente, replay e tombstone. A versao instalada e conhecida por declaracao do usuario, hash e bundle do aparelho nao.
- Saneamento historico das FKs em dominio seguro e com revisao por ID, especialmente categoria/métodos ausentes e classificacoes CREDITO/Verocard. Nao escrever na base real sem autorizacao especifica, rollback e garantia do saldo.
- Planejar corte da autoridade financeira e homologacao visual/funcional da tela antes de qualquer merge e deploy; nao iniciar Etapa 11 antes do fechamento da Etapa 10.

## Restricoes
Proibidos deploy, merge/main, Render, Supabase real, custos, APK Android e Etapa 11. Flags QA nunca servem como autorizacao para escrita produtiva. As demais regras financeiras e UI oficial permanecem intactas.
