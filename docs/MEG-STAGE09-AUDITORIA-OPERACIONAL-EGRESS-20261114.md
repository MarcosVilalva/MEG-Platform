# MEG Finanças | Etapa 09 | Auditoria operacional de Egress e segurança de implantação

**Data da verificação:** 14/11/2026. **Escopo:** produção estritamente em leitura, CI PostgreSQL 17 descartável com dados 100% sintéticos. **Decisão:** GO para investigação e testes isolados; **NO-GO para merge/deploy produtivo**.

## 1. Autoridade, proteções e estado

- Autoridade financeira: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; checkpoint `MEG-WEB-CONTINUIDADE-OFICIAL.md` na PR #666 Draft.
- Código experimental: PR [#689](https://github.com/MarcosVilalva/MEG-Platform/pull/689), branch `experiment/stage09-egress-projection-20261113`. Nenhuma alteração em `main`, Android, Web homologada ou ambiente produtivo.
- Supabase de produção `ugbiqzaqnrhulhetevby` estava `ACTIVE_HEALTHY` no recurso de projeto. Organização `MEG Vilalva` no plano Free. **ACTIVE_HEALTHY não verifica nem encerra bloqueio organizacional por Egress**.
- Render, workspace `My Workspace`, serviço `meg-platform-api`, ID `srv-d98k61daeets7384hvb0`: plano **Free**, 512 MiB de RAM, branch `main`, commit live `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`, autodeploy ativo. Serviço **não modificado**.
- Restrições: não realizar tráfego artificial, migração, escrita, teste de carga ou recuperação no Supabase real; não acionar deploy/merge; não acessar Vault real, Windows/WSL nem dados financeiros individuais.

## 2. Evidência de consultas volumosas de produção (somente leitura)

Consulta agregada de `extensions.pg_stat_statements`, sem retornar lançamentos nem conteúdo de `sourcePayload`. **As estatísticas foram reiniciadas em 10/07/2026 às 18:40:22 UTC**, portanto os totais abaixo abrangem o período desde então, e **não** o ciclo de faturamento 27/10 a 27/11.

| Assinatura SQL | Chamadas acumuladas | Linhas acumuladas | Média por chamada | Caracterização |
|---|---:|---:|---:|---|
| `5094852670518382389` | 6.820 | 24.753.440 | 3.629,54 | SELECT `FinancialEvent` com `sourcePayload` e classificações, correspondente ao `normalizedItems` |
| `8637865989334625977` | 1.326 | 4.814.220 | 3.630,63 | SELECT amplo `FinancialEvent` com `sourcePayload` |
| `839621940969818402` | 3.525 | 11.585.908 | 3.286,78 | SELECT `FinancialEvent` sem `sourcePayload` |
| `-3149437411110864888` | 7.786 | 7.786 | 1 | SELECT `AppState.state`, revisão e metadados por workspace |
| `5240127526163156112` | 4.690 | 4.690 | 1 | SELECT `AppState.state` e metadados por usuário |

Uma segunda leitura em 14/11/2026 às 09:50:46 UTC confirmou ao menos **mais uma chamada e 3.630 linhas** na assinatura `509485...` após a primeira captura. É evidência de atividade, não taxa diária estimável.

**Tamanhos atuais calculados apenas como agregados no PostgreSQL real:** 3.630 eventos legados ativos, média de **1.368,6 bytes por linha na serialização `to_jsonb(e)::text`**, soma **4.968.196 bytes**; `AppState.state::text` com **2.412.952 bytes**. Não foram retornados dados financeiros ou textos de transações. Essas representações JSON não equivalem ao protocolo PostgreSQL ou ao Egress faturado, e o tamanho atual não representa necessariamente todas as datas anteriores.

**Interpretação sustentada:** há consultas integrais repetidas de alto volume. A assinatura de `normalizedItems` é compartilhada por rotinas de auditoria e leitura. Não é possível separar por query ID quantas chamadas vieram de `GET /app-state`, inicialização ou timer. Não está provado que uma única rotina explique os 13,057 GB faturados; o acúmulo de leituras grandes é forte evidência de mecanismo gerador de Shared Pooler Egress.

## 3. Comparação de protocolo PostgreSQL em fixture coerente

No PostgreSQL 17 efêmero com 3.630 eventos fictícios, a chamada de `normalizedStateForRead`, usada pelo `GET /app-state`, retornou estado integralmente reconciliado e transferiu **6.740.517 bytes**, repetindo sem alterações transferiu **6.740.297 bytes**. As duas representações financeiras foram idênticas. [CI PG17 #43582427706](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582427706), SUCCESS.

A PR #689 **não otimiza o GET**. Seu cache criptográfico só é usado pelo timer periódico, enquanto a leitura padrão continua transferindo conteúdo integral a cada chamada. Abrir [issue #690](https://github.com/MarcosVilalva/MEG-Platform/issues/690) para engenharia separada com teste explícito de alterações fora da API, revisão, concorrência, rollback, integridade e RLS.

**Na auditoria periódica isolada:** 6.740.840 bytes integrais, **168 bytes** em repetição imutável (99,998% menos bytes naquela repetição). O timer permanece 15 minutos e a auditoria completa continua obrigatória em mudanças e fallback. Em 12 ciclos sintéticos, redução agregada foi de 91,667% (0% mudanças, inclusive primeira auditoria), 75,006% (25%), 50,014% (50%) e 0,03% (100%). Não extrapolar para tráfego faturado ou servidores que reiniciam frequentemente.

## 4. Produção Render: processo, inicializações e memória

Inspeção somente leitura do serviço real de 13/11 00:00 a 14/11 09:30 UTC:

- **25 inicializações distintas**, 19 em 13/11 e 6 em 14/11, todas com 3.630 eventos, normalização reconciliada no log selecionado. **25 identificadores de instância**. Não prova a causa dos reinícios, mas demonstra que o cache em memória desapareceria a cada novo processo.
- Amostras espaçadas do Render: **61 valores de memory_usage**, mínimo **182.063.100 bytes**, máximo **266.878.980 bytes**; **37 valores de cpu_usage**, de **0,00226995** a **0,0037572167 CPU** nas amostras retornadas. Não correspondem a picos contínuos nem ao custo do código experimental ainda não implantado.
- O endpoint de logs, com filtro `level=error`, não retornou erros nessa janela. Ausência de registros com esse filtro não significa ausência de outros problemas.
- Consumo de bandwidth do Render não equivale ao Shared Pooler Egress do Supabase. Não somar as duas métricas.

## 5. Stress real de 512 MiB de memória no CI

Workflow [PG17 #43582674118](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582674118): **SUCCESS**, PostgreSQL 17 descartável, Docker cgroup com `memory.max` verificado em 512 MiB, Node e Prisma na própria imagem isolada.

| Fixture | Estado reconciliado? | RSS Node após preview | Pico cgroup reportado | Tempo de SHA | Tempo do preview |
|---:|---|---:|---:|---:|---:|
| 3.630 eventos | **Sim** | 173,42 MiB | 119,79 MiB | 68,22 ms | 286,88 ms |
| 24.000 eventos | **Não**, fixture de escala sem classificação integral | 467,12 MiB | 436,86 MiB | 372,35 ms | 1.536,66 ms |

`RSS` do processo pode incluir páginas compartilhadas contabilizadas diferentemente do cgroup. O limite de cgroup foi verificado em 512 MiB, mas um teste de 24.000 eventos executado sem divergência financeira ainda não foi caracterizado; não tratar o êxito do benchmark como homologação financeira de 24.000 lançamentos. O processo de 24.000 chega próximo do teto Free e mostra **risco de pouca margem para cargas simultâneas**. Os resultados não medem CPU/memória internos do Supabase.

O primeiro teste de memória falhou por asserção da fixture que contava evento arquivado como ativo; corrigido apenas no teste com contagem de eventos não arquivados. O teste de integração de leitura apresentou erro TypeScript de estreitamento de união; corrigido no teste sem mudança da lógica financeira. No HEAD final testado antes desta documentação, CI geral [#43582674039](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582674039) e PG17 [#43582674118](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582674118): **SUCCESS**.

## 6. Bloqueador P0 de deploy constatado em produção

O **Build Command atual do serviço Render de produção** contém, nessa ordem:

```bash
npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production
```

Auditoria do código da branch `main` confirmou que:
- `packages/database/prisma/prepare-production.ts` **executa DELETE na tabela Budget**, preservando o registro mais recente por grupo se encontrar duplicatas.
- `db:push:production` executa `prisma db push --accept-data-loss`, aceitando a perda de dados em alterações de schema, seguido de `ensure-performance-indexes.ts`, que executa `CREATE INDEX IF NOT EXISTS` em tabelas financeiras.

O build atual não é operacionalmente seguro como veículo para experimento de Egress. **Não realizar deploy nem modificar Build Command sem plano de migração aprovado e separação da etapa de dados.** Evidência registrada na [issue #691](https://github.com/MarcosVilalva/MEG-Platform/issues/691). Nenhum script foi executado no banco real.

## 7. Decisão, próximos gates e restrições

**Conclusões encerradas:** consultas volumosas reais demonstradas; footprint atual de dados mensurado sem revelar informações financeiras; código SHA sintético validado; stress cgroup de 512 MiB executado; Render produção e script de build auditados; branches e documentação preservadas.

**Pendente para GO operacional:** correlação direta por endpoint na janela de faturamento, redução de Egress realmente faturado, otimização independente do GET, staging com isolamento real e plano de rollback, homologação completa do Supabase (Vault/Auth/Storage/Realtime/Functions), correção do Build Command destrutivo e autorização de mudança produtiva. Gate 1 de recuperação permanece PARCIAL e Gates 2/3/4 NO-GO. Issues #674 e #676 continuam abertas. Não consumir créditos, criar serviço pago, alterar banco/Render de produção, mudar plano, fazer merge, ou implantar.

Próximo passo exato: desenvolver e caracterizar a redução de leituras do `GET /app-state` em **branch isolada**, sem confundir com a PR #689. Em paralelo, remover a dependência de mutação de banco do build produtivo somente após desenho seguro e aprovação. A implantação final depende dessas duas linhas de trabalho e de nova autorização.
