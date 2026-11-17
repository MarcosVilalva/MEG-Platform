# MEG Web Evolution | Etapa 10 | Gate de compatibilidade legado e isolamento de escritores

**Data:** 17/11/2026. **Escopo:** exclusivamente Marco 5 da Etapa 10.  
**Repositório:** `MarcosVilalva/MEG-Platform`. **PR:** #697 Draft. **Bloqueio:** Issue #699 P0.  
**Progresso auditável:** **4/10 = 40% técnico**. **Migração produtiva: 0%**.

## 1. Contrato real do cliente congelado, executado sem alterar Android

Novo teste `apps/web/src/stage10-frozen-legacy-409-harness.test.js` lê e executa, com mocks controlados de rede, armazenamento e navegador, o corpo original de `ensureOutboxConfirmed` retirado do próprio `apps/web/src/instant-persistence.js`. Não modifica esse arquivo, o APK ou as dependências do bundle Android.

Com um `upsert` fictício de evento arquivado e resposta HTTP 409:
- Uma invocação da função faz três PATCH. Duas invocações com outbox persistente fazem **seis PATCH**.
- O cliente não lê o corpo da resposta 409 e, portanto, **ignora** `error` e `retryable:false`.
- A operação não é confirmada nem retirada do outbox. Não se afirma que qualquer escrita tenha sido aceita no servidor.
- No modo offline o método não faz chamada de rede; o outbox permanece protegido.

O mesmo teste extrai `scheduleOutboxRetry` do cliente intacto e prova, com relógio simulado e erro permanente HTTP 422, que o cliente **continua agendando tentativas** de acordo com o backoff. Assim, mudar apenas 409 para 422 não corrige o protocolo.

**Evidência:** [Actions #44088879141](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44088879141), **SUCCESS**. Isso é uma caracterização executável do código JS legado, não um teste num APK real nem homologação Android.

## 2. Implicação de segurança

Sem uma instrução de restauração causal e autenticada no protocolo legado, o servidor não consegue distinguir uma reinserção deliberada da mesma chave histórica de um replay atrasado apenas por `operationId`/`expectedRevision`/`upserts`. A API não deve responder sucesso quando rejeitou uma mudança financeira, nem reativar `FinancialEvent` arquivado apenas para evitar retry. Por regra do projeto, **Android permanece congelado**.

Portanto, **não existe solução comprovadamente segura baseada somente na troca de status HTTP** para esse cliente. Isso mantém o P0 aberto e torna um deploy do código protegido na API compartilhada inadequado neste momento.

## 3. Gate de congelamento de código Android e legado

O workflow QA passa a comparar a branch com o baseline `5a3f6b81817b7739d0c13f509d93f9898b7b5245` (base PR #696), usando `git diff --exit-code` para os caminhos Android/Capacitor e os arquivos centrais de persistência legada. A prova impede alterações acidentais **nesses caminhos cobertos**. Não equivale a um teste físico da APK nem garante ausência de mudanças por todos os arquivos auxiliares; ampliar o escopo caso a integração encontre outras dependências no bundle.

**Evidência:** [Actions #44088879141](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44088879141), SUCCESS no gate de arquivos congelados.

## 4. Alternativa ensaiada para destravar desenvolvimento seguro sem tocar Android

Novo script `scripts/meg-stage10-writer-cohort-isolation-synthetic.pg17.sql` cria **somente dentro de uma transação em PG17 descartável**:

1. Dois schemas fictícios distintos, `stage10_qa_android` e `stage10_qa_web`;
2. Dois papéis de writer separados, com permissões de schema restritas;
3. Dois registros fictícios com o mesmo ID em esquemas diferentes;
4. Uma atualização permitida dentro de cada esquema;
5. Provas de negação de acesso de leitura e escrita cruzados;
6. `ROLLBACK` e conferência de inexistência de schemas/roles remanescentes.

**Evidência:** [Actions #44089175372](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44089175372), **SUCCESS**, incluindo a prova bidirecional de isolamento, PG17, rotas HTTP Fastify, regressões financeiras, cliente legado, TypeScript e rollback. Nenhuma criação de papel, schema, trigger, tabela ou função ocorreu em Supabase/Render produtivo.

**Limites:** o teste verifica a capacidade do PostgreSQL de isolar duas roles, **não** dois serviços API reais. Um processo que se conecta com superusuário ou credencial capaz de atravessar schemas rompe essa barreira. Dados copiados em dois schemas divergem sem um protocolo transacional e reconciliação aprovados. A arquitetura de produção compartilhada ainda não foi alterada.

## 5. Decisão de engenharia da Etapa 10

**Caminho aprovado somente para estudo/QA:** preparar a nova Web com API e esquema/credenciais isolados, utilizando PostgreSQL descartável e dados fictícios, enquanto o Android permanece em sua API e base atual. As permissões devem impor isolamento efetivo. O teste atual é o primeiro gate dessa opção, não a implantação de dois serviços.

**Não fazer:** deploy da API normalizada sobre o endpoint consumido pelo Android congelado, aceitar restauração automática, forjar HTTP 200, ativar triggers de bloqueio em produção, habilitar writers financeiros diretamente no banco produtivo, copiar dados reais sem plano aprovado, criar infraestrutura paga ou fazer merge.

**Próximo gate para o Marco 5:** executar **dois serviços API reais** com credenciais de banco de privilégio mínimo em QA isolado; comprovar que cada serviço não acessa o esquema do outro, que offline/replay/409 do cliente existente não atingem os eventos da nova Web e que não há duplicidade/reconciliação falsa. Verificar a rota efetivamente usada pela APK instalada. Em seguida definir cutover/reconciliação com autorização específica e sem perda de histórico. Somente com essa evidência e compatibilidade demonstrada o marcador 5 poderá ser concluído.

O [PR #697](https://github.com/MarcosVilalva/MEG-Platform/pull/697) permanece Draft e a [Issue #699](https://github.com/MarcosVilalva/MEG-Platform/issues/699) permanece aberta. Não há merge, deploy, alteração de dados reais nem aprovação visual implícita.


## 6. Segundo gate: duas instâncias reais Fastify/Prisma, credenciais separadas, PG17 descartável

**Evidência:** [Actions #44089989091](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44089989091) **SUCCESS**.

Arquivos adicionados:
- `scripts/meg-stage10-two-api-schemas-init.pg17.sql`: cria, exclusivamente no banco descartável `meg_stage10_sandbox`, os usuários de conexão `stage10_cohort_android_login` e `stage10_cohort_web_login`, cada um proprietário de um schema próprio;
- `scripts/meg-stage10-two-api-cohort-qa.sh`: inicializa os schemas, aplica Prisma `db push` de teste separadamente em cada schema, executa testes sequenciais em processos Node/tsx independentes e destrói os schemas/roles no encerramento;
- `apps/api/src/modules/finance/stage10-two-api-cohort.isolated.test.ts`: inicializa Fastify com as rotas reais `appStateRoutes`, usa identidade de sessão **simulada**, cria workspace/conta fictícios, faz PATCH de criação e edição preservando ID, confere a leitura de fonte normalizada e recusa leitura direta do schema da outra coorte com PostgreSQL `insufficient_privilege` / SQLSTATE `42501`.

**Escopo da prova:** as duas instâncias foram executadas **sequencialmente**, não foram publicadas, não compartilharam escrita nas mesmas tabelas e não testaram simultaneidade de dois dispositivos. O teste usa schema e credencial de banco separados dentro do mesmo container PostgreSQL 17 do GitHub Actions, sem serviço externo. `Prisma db push` ocorreu **somente** nesses schemas fictícios, e a rotina de cleanup conferiu a destruição de papéis e esquemas criados.

**Resultado arquitetural:** ficou comprovado que a mesma aplicação pode operar com duas credenciais de privilégio mínimo e schemas separados, sem acesso SQL cruzado nos cenários testados. Não foi comprovada a compatibilidade do Android instalado, a segurança da infraestrutura de hospedagem, a replicação/cutover de dados reais, nem uma integração de sessão JWT real. Essas tarefas permanecem pendentes. O pacote de produção não pode simplesmente compartilhar a mesma credencial administrativa ou apontar ambas as instâncias para o mesmo schema `public`.

**Atualização do próximo gate:** validar um cenário simultâneo de cliente legado/novos escritores em QA isolado e autenticação real, além do contrato de transição/reconciliação. Manter a Issue #699 P0 e o marco 5 abertos. Indicador do saneamento: 40% técnico, 0% migração real.
