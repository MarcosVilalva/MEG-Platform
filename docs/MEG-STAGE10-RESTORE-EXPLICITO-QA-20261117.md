# Etapa 10 | Recuperacao explicita de identidade historica | QA descartavel
Data: 17/11/2026. PR #697 Draft. Issue #699 P0 ainda aberta.

## Decisao funcional que o codigo preserva
Android e nova Web utilizam a mesma base existente, mas uma unica autoridade por dominio financeiro. FinancialEvent conserva a identidade e efeitos canonicos. AppState e somente o espelho de compatibilidade quando o modo normalized-primary esta ativado.

Um PATCH legado que reinsere uma ID arquivada e insuficiente para demonstrar intencao de restauracao. Continua recebendo NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE e nao escreve. A intencao legitima agora possui protocolo NOVO e EXPLICITO, sem mudar o PATCH do cliente 2.0.708.

## Implementacao real no codigo
- Novo apps/api/src/modules/app-state/legacy-restore.ts. GET /app-state/legacy-restore/:legacyId fornece somente metadados autorizados ao ADMIN. POST no mesmo caminho exige operationId UUID, eventId, expectedRevision, expectedArchivedAt, expectedUpdatedAt e a confirmacao literal CONFIRMAR_RESTAURACAO_EXPLICITA. Nao aceita payload de transacao novo, nao muda valores ou categoria.
- As rotas sao registradas SOMENTE com MEG_STAGE10_ISOLATED_PG=1 e MEG_STAGE10_LEGACY_RESTORE_QA=1 mais DATABASE_URL no usuario meg_stage10_ci, hostname 127.0.0.1 e banco meg_stage10_sandbox. Nenhuma rota de restauracao habilitada em producao.
- Permissao ADMIN e assertWorkspaceWriteAccess. Resolve o workspace/titular e valida eventId, legacyTransactionId, archivedAt exato, updatedAt exato, revisao do AppState e normalized-primary.
- Restringe a recuperacao monetaria simples a income/expense, conta checking/savings/cash ativa e do titular, status historico recuperavel e referencias canonicas ativas. Recusa status archived sem proveniencia do estado anterior, dominios Verocard/beneficio/credito/cartao, transferencias, importacao, recebivel, baixa ou ledger preexistente. Nenhuma reclassificacao por similaridade.
- Em transacao PostgreSQL SERIALIZABLE: a autoridade monetaria verifica saldo para despesa realizada; atualiza archivedAt da MESMA linha com compare-and-swap; reutiliza syncLedger do writer financeiro existente; restaura o espelho via writeBackNormalizedEventsToAppState sem duplicar ID; registra FINANCIAL_EVENT_RESTORED em AuditLog e CloudMutationReceipt para idempotencia.
- Erro bloqueia e reverte integralmente tudo. Nao converte conflitos em sucesso. Mesmo operationId retorna recibo original com idempotentReplay=true; operationId com outro payload e rejeitado.

## Evidencia executada
- Commit de implementacao c3a2ffae122023bc963c39c6af6f60d38d3420be: as assercoes de restauracao, rollback e idempotencia chegaram ao PASS, mas o workflow #44145704517 foi FAILURE por limpeza incompleta de ledger na fixture PG17.
- Correção da limpeza de TODAS as dependencias do workspace no teste PG17: commit 02f9ed64421627b3094947243bd1de256cd04c91.
- Actions #44145843511 SUCCESS (29 passos verdes e 1 APK condicional skipped). Teste integra Fastify.inject e PostgreSQL 17 descartavel, com identidade de teste SIMULADA, nao JWT real. Valor, ID, metodo, categoria e ledger comparados antes/depois; reexecucao sem duplicata; dados sinteticos e cleanup completo.
- Nenhuma escrita em Supabase real. Nenhuma APK, deploy, merge, custos ou main.

## Limitacoes que impedem liberacao produtiva
1. O codigo precisa de aprovacao de contrato de producao e ambiente isolado com JWT REAL antes de habilitar rotas fora do PG17 descartavel. Nao e uma API produtiva nem um writer publicado.
2. Versao instalada informada pelo usuario 2.0.708, mas o contrato de sincronizacao binario e a homologia exata com a release auditada ainda nao foram comprovados em aparelho.
3. Recuperacao de status archived por writers de dominio, beneficio, cartao, transferencias ou eventos com vinculos requer autoridade do respectivo dominio, nao deve ser realizada por este endpoint.
4. A relacao antiga de nomes de categoria e pagamento e ainda ambigua (#700); nao executar atualizacoes automaticas em FKs. Nao afirmar que a restauracao resolvesse o saneamento historico.
5. No Android 2.0.708 instalado, o usuario ainda nao tem uma interface para invocar a nova recuperacao explicita. A correcao do loop de rejeicao do outbox permanece apenas no fonte QA. Uma distribuicao futura requer autorizacao especifica.
6. Continuam necessarios contrato de backup/rollback e homologacao funcional com cliente e banco isolados. PR #697 Draft, Etapa 10 exclusiva.

## Proximo passo objetivo
Mapear a assinatura/rota de persistencia realmente executada pelo bundle da release Android 2.0.708, confrontar via QA com a API protegida, e preparar a integracao do writer Web sem duplicacao. Antes de habilitar restauracao produtiva, validar JWT e autorizacao real, politicas de dominio e metodo de confirmacao na UX sem reutilizar layout Android.
