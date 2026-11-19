# MEG Etapa 09 | Experimento isolado de redução do Shared Pooler Egress

**Data:** 13/11/2026. **Status:** EXPERIMENTAL, sem autorização de merge ou deploy.

## Autoridade e escopo

- Repositório: `MarcosVilalva/MEG-Platform`.
- Base imutável: commit `6f131d69731c06f1f4137f6a8f06a7d07caf92be`, PR #666 Draft.
- Branch experimental: `experiment/stage09-egress-projection-20261113`.
- Produção Render `meg-platform-api` não foi modificada, assim como Supabase de produção, Android e Web homologada.
- Gates: Gate 1 PARCIAL; Gates 2, 3, 4 NO-GO.
- Autoridade financeira: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.
- Evidência de consumo da organização Supabase: 13,057 GB no ciclo 27/10 a 27/11, dos quais 13,002 GB em produção; 100% Shared Pooler nos pontos observados em 05/11 e 12/11. Os registros não atribuem bytes a consultas individuais.

## Alteração proposta

Arquivo: `apps/api/src/modules/app-state/normalized-primary-writeback.ts`.

A consulta `tx.financialEvent.findMany` de eventos ativos, usada em `reconcilePrimaryAppStateFromNormalized`, retorna hoje todos os campos de `FinancialEvent`, além do nome do meio de pagamento. O espelho usa apenas `id`, `legacyTransactionId`, `date`, `description`, `type`, `status`, `amount`, `signedAmount`, `notes`, `sourcePayload`, `accountId` e `paymentMethod.name`. A experiência substitui `include` por projeção Prisma `select` com exatamente esses campos.

**Preservados:** transação, `updateMany` com revisão esperada, detecção de divergências em `sourcePayload`, exclusões de eventos arquivados e órfãos, sinal de estorno, histórico de auditoria, fingerprint e toda lógica de saldo. Não reduz o timer de 15 minutos e não remove `sourcePayload`.

## Caracterização sintética offline (sem rede)

Harness local independente: `MEG-STAGE09-EXPERIMENTO-PROJECAO-20261113.mjs`; fixture sintética de 3.630 eventos com campos de `FinancialEvent`. Testa igualdade dos espelhos, decisões de refresh, IDs e fingerprint para payloads de 256, 512, 1024 e 2048 bytes nominais, bem como estorno, receita, pagamento e meio de pagamento nulo.

| Payload alvo fictício | JSON da linha completa | JSON com select | Redução estimada dessa consulta |
|---|---:|---:|---:|
| 256 B | 3,70 MB | 2,24 MB | 39,55% |
| 512 B | 4,58 MB | 3,11 MB | 31,96% |
| 1024 B | 6,44 MB | 4,97 MB | 22,73% |
| 2048 B | 10,15 MB | 8,69 MB | 14,41% |

**Limitação:** a medida é somente `JSON.stringify` sintético, não bytes reais em PostgreSQL/Supavisor. É redução potencial **de uma consulta** feita na inicialização, não redução total do Egress, nem garantia de ficar abaixo de 5 GB.

## Validações

- Teste offline Node: PASS.
- Teste de caracterização no repositório: ampliado em `normalized-primary-writeback.test.ts` para validar projeção e equivalência da reconstrução, atualização de sourcePayload e fingerprint.
- CI da branch experimental: **SUCCESS** no commit `baa5f77cfdfeb743e73ca4fbbbb6dd5a1f93dc7a`, via branch de QA que apontou ao mesmo commit. [MEG Platform CI #43548438092](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548438092), incluindo testes e build; [PG17 Wire #43548437998](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548437998), com PostgreSQL 17 descartável. Não houve homologação em produção.
- Teste com PostgreSQL 17 **descartável de CI** e medição local de bytes do protocolo PostgreSQL: **SUCCESS**. O ensaio não usou o banco de restauração WSL ou Supabase.
- Prova da causa quantitativa dos 13 GB, verificação operacional da quota e gates de recuperação: pendentes.

## Medição do protocolo PostgreSQL 17 no job descartável (13/11/2026)

Evidência: [workflow pg17-egress-wire #43548437998](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548437998), SHA `baa5f77cfdfeb743e73ca4fbbbb6dd5a1f93dc7a`. O job utiliza container PostgreSQL 17 efêmero, Prisma Client e proxy TCP exclusivo do `127.0.0.1`, que conta bytes enviados pelo servidor PostgreSQL ao cliente. A base usa 3.630 eventos fictícios e `AppState` fictício **reconciliado**.

| Consulta ou rotina | Bytes servidor → cliente | Escopo |
|---|---:|---|
| Startup, `findMany` com `include` original | 4.375.109 | Leitura integral da linha |
| Startup, `findMany` com `select` experimental | 3.772.587 | Apenas campos necessários |
| Diferença direta | **602.522** | **13,772% nessa consulta** |
| `normalizationPreview` periódica, intacta | **6.740.840** | Leitura do `AppState` e eventos completos |

`normalizationPreview` obteve `reconciled=true` nos dados sintéticos. Se essa auditoria ocorresse 96 vezes em 24h sem interrupção, representaria **647.120.640 bytes por dia** nesse cenário, hipótese de atividade contínua que não se aplica necessariamente ao Render Free.

**Validações confirmadas no job**: mesmo espelho anterior/projetado para 3.630 eventos, detecção de divergência de payload, arquivados e órfãos removidos, ledger inalterado, idempotência inicial, rollback, recusa de revisão desatualizada e apenas um vencedor em duas reconciliações concorrentes.

**Limitações**: o proxy registra bytes do protocolo PostgreSQL sem TLS local, não despesas ou volume cobrado pelo Supabase. O resultado por consulta não prova causalidade dos 13,057 GB organizacionais. O primeiro ensaio falhou por fixture que serializava dinheiro como string; corrigido apenas no teste, sem mudança financeira. O ensaio de base compatível foi concluído com SUCCESS.

A auditoria periódica ainda transfere uma representação completa e **não foi otimizada**. Não desativar nem espaçar o timer nem aceitar checksum abreviado sem caracterização formal de equivalência de `normalizationFingerprint`, cobertura de deletados, writes concorrentes, rollback e fallback, incluindo alterações fora da API.

## Critérios antes de cogitar integração

1. Build TypeScript e teste `test:app-state` verdes na branch experimental.
2. Regressão financeira mais ampla verde, sem alteração de saldo, parcela, benefício, cartão, idempotência, ledger, transferência ou histórico.
3. Medição confiável de bytes e consultas no PostgreSQL isolado, incluindo resultado após escrita concorrente e rollback.
4. Avaliação explícita da redução real de Egress e autorização separada antes de qualquer merge ou deploy.
5. Preservar PR #666, issues #674/#676, Android e telas aprovadas.

## Restrições

Nenhuma alteração em `main`, serviço Render, Supabase produtivo, ambiente WSL, Android ou Web homologada. Nenhuma operação destrutiva, testes de carga em produção, mudança de plano, restore/backup ou atualização de segredo.


## 14/11/2026 | Auditoria periódica com SHA-256 integral no banco (experimental)

**Código novo:** `apps/api/src/modules/app-state/normalization-periodic-audit.ts`. Único ponto de uso novo: timer de 15 minutos em `apps/api/src/server.ts`. Nenhum endpoint, writer, regra financeira ou assinatura de `normalizationPreview` foi alterado.

### Desenho e integridade

- Cada verificação executa uma instrução SQL parametrizada, somente de leitura, em PostgreSQL 17. Obtém SHA-256 calculado no banco sobre **toda a linha `AppState`** e sobre **todas as linhas `FinancialEvent` do workspace** (inclui registros normais e arquivados; a agregação é ordenada por ID). O payload completo não atravessa o protocolo nesta etapa.
- O resumo completo do último `normalizationPreview` só é reutilizado se os dois SHA-256 forem idênticos aos de uma auditoria anterior efetivamente reconciliada. Uma mudança de `sourcePayload`, saldo/valor, status, remoção, inserção, arquivamento, metadados, mesmo fora da API, invalida o atalho e exige a **auditoria financeira original**, com `normalizationFingerprint` original.
- Na primeira leitura ou após alteração, o código executa a auditoria completa. Só armazena resultado se o estado for `normalized-primary`, `reconciled=true` e os SHA-256 medidos **antes e depois** da auditoria forem idênticos. Em modo rollback, divergência ou falha na consulta SHA, não há decisão otimista: executa o caminho completo e não guarda o resultado inválido.
- Cache somente em memória do processo, limitado a 16 workspaces e particionado também por usuário. Reinício perde o cache e executa a auditoria completa; não há nova tabela, migração, plano, atualização de segredos ou alteração de dados.
- O SHA-256 é um *detector de mudança da representação completa no banco*, não substitui o fingerprint canônico. A avaliação continua sujeita aos limites usuais de observação instantânea e à hipótese criptográfica de resistência a colisões, sem promessa de verificação continuamente em tempo real.
- A consulta SQL agregada também consome CPU, I/O e memória do PostgreSQL. **Não foram medidos p95, CPU/IO/latência real do Supabase nem Egress cobrado.** Não está aprovado para produção e não permite estimar economia total faturável.

### Medição PostgreSQL 17 descartável, somente fixture sintética

- **3.630 eventos fictícios** e mesmo fixture e proxy TCP local da primeira rodada. [Job PG17 #43550388540](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43550388540): **SUCCESS**, commit testado `51950af7e40731bd7650dc00020b596d94e566e1`.
- `normalizationPreview` original: **6.740.840 bytes** do servidor para o cliente.
- Primeira auditoria com SHA (cache vazio): **6.740.656 bytes**, valor próximo ao baseline, **sem economia significativa**; variações pequenas na instrumentação não têm significado financeiro.
- Repetição da auditoria sem mudança: **168 bytes** do servidor para o cliente, ou **99,998% menos bytes que a execução original** nesse cenário e nessa condição. Não se deve projetar esse percentual para períodos com mutações frequentes.
- Seleção do startup, inalterada nesta rodada: **4.375.109 → 3.772.587 bytes**, queda de **13,772%** exclusivamente na leitura do startup.

### Testes executados e preservação

**PASS no PostgreSQL 17:** espelho e fingerprints financeiros idênticos na situação normal; drift por campo `notes` alterado fora da API; adulteração exclusiva de `sourcePayload`; variação direta de `signedAmount`; mudança de campo não financeiro em `AppState`; arquivamento externo de evento; modo `app-state-rollback`; escrita intercalada entre os dois hashes e a leitura completa, impedindo cache indevido; remoção de arquivados e órfãos; `LedgerEntry` intacta; rollback transacional; revisão obsoleta rejeitada; dois reconciliadores concorrentes com um vencedor; idempotência e auditoria sem duplicação.

**CI geral:** [MEG Platform CI #43550388576](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43550388576), **SUCCESS** no SHA acima. Não representa aprovação financeira de produção nem prova visual. A primeira tentativa do teste de digest falhou devido à asserção artificial `initial >= baseline` sobre bytes observados; a asserção foi substituída por verificação de tráfego positivo, sem mexer na regra financeira, e a rodada estendida final fechou SUCCESS.

### Conclusão e limites da investigação

**Confirmado:** o atalho criptográfico preservou os cenários sintéticos caracterizados e reduziu para 168 bytes a resposta do PostgreSQL em uma auditoria periódica sem alterações. **Não confirmado:** se a rotina explica os 13,057 GB do Supabase, se a economia ocorre com frequência suficiente na produção, seu custo real de CPU e o impacto no consumo faturável. O timer continua em 15 minutos e os gates de recuperação permanecem Gate 1 PARCIAL, Gates 2–4 NO-GO.

**Governança:** PR #689 e PR #666 Draft, sem merge/deploy. A PR #689 está 2 commits atrás da branch-base #666, ambos apenas no arquivo de checkpoint (comparação feita em 14/11); revalidar antes de eventual integração. Android, Web homologada, Supabase, Render, WSL, Vault, dados reais e configuração de cobrança não foram alterados.

Próximas evidências necessárias para uma conclusão operacional: correlação read-only por query/endpoint na origem real do Shared Pooler, medição de custo de CPU/IO/latência, frequência efetiva de cache hits e série de Egress após autorização expressa de implantação segura. Até lá, **sem recomendação de merge ou deploy**.


## 14/11/2026 | Escalabilidade PG17, taxas de alteração e verificação operacional adicional

**Escopo mantido:** exclusivamente CI com PostgreSQL 17 efêmero. Nenhum dado, migração, produção, Vault, Render ou Supabase real foi modificado. Workflow `.github/workflows/meg-stage09-egress-pg17-synthetic.yml` ganhou a etapa isolada `apps/api/src/modules/app-state/stage09-egress-performance-pg17.test.ts` após os testes financeiros de integridade.

### Comparativo de execução do servidor PostgreSQL (EXPLAIN ANALYZE)

Benchmark de 3 repetições cronometradas após aquecimento por tamanho. O valor é a mediana de `Execution Time` no servidor PostgreSQL, **não porcentagem de CPU** nem latência do Supabase. As duas variantes têm assinatura de linha completa e toda a representação é comparada. Resultados do job [#43552019834](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552019834) (SUCCESS):

| Eventos fictícios | SHA-256 via `jsonb_agg` original | SHA-256 por linha + `string_agg` adotado | Redução da mediana |
|---:|---:|---:|---:|
| 3.630 | 84,306 ms | 52,137 ms | 38,2% |
| 12.000 | 256,928 ms | 152,631 ms | 40,6% |
| 24.000 | 516,758 ms | 290,242 ms | 43,8% |

Uma segunda rodada [#43552309177](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552309177) também terminou SUCCESS, com tempos 87,215 → 60,394 ms; 300,870 → 206,147 ms; 600,050 → 393,725 ms. A variabilidade entre execuções impede impor um ganho absoluto universal. Por reduzir o volume intermediário que chega ao agregador, a branch experimental passou a usar `string_agg` dos hashes de 64 caracteres das **linhas completas**, ordenados por ID, e SHA-256 final. O teste confere que `completeDatabaseSignature` corresponde exatamente à variante adotada.

A terceira rodada [#43552538645](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552538645) (SUCCESS) comparou também uma variante com CTE `MATERIALIZED`: em 3.630/12.000/24.000 eventos sua mediana foi 104,512/277,381/559,896 ms, acima da versão por linha sem CTE (78,416/243,306/483,180 ms). **CTE não adotada.** A assinatura criptográfica foi idêntica entre essas duas variantes em todos os tamanhos.

`EXPLAIN (ANALYZE, BUFFERS)` também foi coletado. Houve execuções sem leitura/escrita de blocos temporários, mas uma rodada com estado sintético modificado registrou até 3.068 blocos temporários escritos em 24.000 eventos nas duas variantes. Portanto, o SHA por linha **não elimina garantidamente uso de arquivos temporários**, e nenhum limite de memória do PostgreSQL foi comprovado. A comparação foi feita com o mesmo tamanho de fixture dentro de cada rodada.

### Ensaios de acerto do cache com frequência de alterações

12 auditorias por cenário, todas fictícias e com confirmação de reconciliação; mutação controlada em propriedade do AppState apenas para invalidar a assinatura. Resultado [PG17 #43552309177](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552309177), SUCCESS:

| Cenário de mutações | Acertos (de 12) | Bytes totais transferidos | Economia frente a 12 auditorias integrais |
|---:|---:|---:|---:|
| 0% | 11 | 6.740.723 | 91,667% |
| 25% | 9 | 20.217.858 | 75,006% |
| 50% | 6 | 40.433.701 | 50,014% |
| 100% | 0 | 80.865.396 | 0,031% |

O cenário de 0% não mostra 99,998% agregado porque inclui a **primeira execução integral obrigatória**. Com mudança a cada ciclo, a economia efetiva desaparece. Esta simulação não mede a taxa real de alterações do MEG nem efeitos de reinicializações frequentes no Render.

### Memória e concorrência

Para as fases 3.630/12.000/24.000, o processo Node do runner registrou na rodada final RSS de **455/616/1.060 MiB**, respectivamente, **após** construir/avaliar o preview completo. Esse RSS não é memória do PostgreSQL e **não pode ser atribuído apenas ao novo SHA**. É sinal de risco de crescimento da auditoria integral e das fixtures no Node em tamanhos maiores, não previsão direta de consumo de produção. Quatro assinaturas concorrentes na rodada final concluíram em 174/452/884 ms de tempo total de parede, respectivamente. Não foi medida concorrência multi-instância real de Render.

**Referência de capacidade:** [documentação oficial Render Compute Plans](https://render.com/docs/compute-plans) lista 512 MB RAM e 0,1 CPU para o plano `free`. **Não foi confirmado o plano da instância Render efetivamente utilizada**, por falta de seleção autorizada do workspace e de métricas privadas. Não assumir tolerância de 24.000 eventos em plano Free apenas com base no runner de CI.

### Observação externa sem mutações

Consultas agregadas de `supavisor_logs` e `postgres_logs` via serviço de Logs do Supabase, **somente leitura**, sem acesso aos lançamentos: 12/11 UTC, 1.315 e 412 entradas; 13/11 UTC, 1.201 e 413 entradas, respectivamente. No dia 13/11, 951 logs do Supavisor eram `session` (level info), 218 `proxy`, 32 sem modo. Esses registros não contêm volume de bytes por SQL e não provam origem causal. `get_project` retornou `ACTIVE_HEALTHY`, que não prova que as restrições organizacionais por Egress tenham sido removidas. [Supabase oficial](https://supabase.com/docs/guides/platform/manage-your-usage/egress) confirma que resultados de consultas via Supavisor compõem Shared Pooler Egress, mas **não fornece atribuição quantitativa por consulta** nesses logs.

Comparação apenas hipotética do fixture: 94 auditorias completas (94 × 6.740.840) + 19 leituras de startup completas (19 × 4.375.109) totalizariam 716.766.031 bytes em um dia, próximos de 715,37 MB do tooltip de produção em 12/11. **Não foi comprovado que ocorreram exatamente 94 auditorias, que os payloads reais têm o mesmo tamanho ou que essas eram todas as consultas**, logo a proximidade aritmética não constitui identificação causal definitiva.

### Situação de entrega e critérios

- Todos os testes financeiros, hash e medição sintética avaliados até os jobs citados: **PASS**. Os jobs gerais correspondentes também concluíram SUCCESS.
- A PR #689 permanece **Draft**, sem merge em PR #666 ou `main`, sem deploy. A branch experimental foi sincronizada com a base atual de #666 em commit de integração **interno à branch experimental**, preservando os mesmos nove arquivos de alteração e nenhum código de produção. Revalidar CI do HEAD após documentação.
- **NO-GO operacional:** faltam métricas reais de CPU/IO/memória de Supabase e Render, taxa de cache hits/uptime, atribuição real de bytes e teste em staging de infraestrutura comparável. A CI efêmera é homologação técnica sintética, **não** homologação operacional de produção.
- **Deploy e merge produtivo não executados nem autorizados.** Não contornar quotas com upgrade, alteração de plano, intervalo ou remoção de fingerprint. Gates de DR: Gate 1 PARCIAL; Gates 2–4 NO-GO. Issues #674/#676 permanecem abertas.
