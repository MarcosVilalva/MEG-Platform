# MEG Finanças Web Evolution | Etapa 10
## Proposta registrada: entrada MEG sem tela Render, preparação da sessão e navegação eficiente com plano Free
**Data da decisão:** 17/11/2026
**Status:** BACKLOG FORMAL / PROPOSTA TÉCNICA, NÃO IMPLEMENTADA; nenhuma homologação visual nova.
**Repositório:** `MarcosVilalva/MEG-Platform`
**Branch de registro:** `stage10/prism-real-read-optin-20261116`
**PR:** #696 Draft, sem merge
**Motivação:** solicitação explícita do responsável para personalizar o despertar no Render e preparar dados financeiros após início da sessão, antes da Home, com acesso eficiente a qualquer período sem adquirir plano pago.

## 1. Duas melhorias distintas
### 1.1 Remover a experiência genérica de despertar do Render da interface inicial
- A tela de despertar é gerada pelo **provedor antes de o servidor Web Free responder**. A UI React sozinha não pode substituí-la no mesmo serviço que está suspenso.
- **Caminho a estudar, não autorizado para execução:** disponibilizar uma camada estática de entrada/login/loading do MEG, com a identidade visual oficial e adaptável à responsividade, independente do despertar da API/gateway; acoplar API autenticada pela arquitetura segura existente, com BFF/gateway ou topologia equivalente que preserve autenticação, CORS, mesma origem quando exigido e bloqueio de escritores.
- Exibir estado real de `conectando`, `validando sessão`, `preparando painel`, `consulta parcial`, `indisponível`; sem barra com percentuais fictícios, sem prometer instantaneidade da API.
- Não criar novos serviços, domínios, rotas públicas, custos ou hospedagem durante este registro. Fazer preflight de custos, isolamento, segurança e aderência ao print oficial antes de qualquer prova.
- Gates futuros: serviço estático acessível imediatamente com API adormecida, login/revogação/JWT testados, separação entre usuários e workspaces, bloqueio financeiro read-only, testes de reconexão, carregamento e aprovação visual expressa.

### 1.2 Preparação dos dados depois da autenticação e antes da Home
**Objetivo funcional:** ao concluir a validação de sessão, iniciar leitura canônica mínima dos dados indispensáveis para a primeira renderização; a Home receber o que já foi conferido em memória e não disparar as mesmas consultas imediatamente. A espera pelo conjunto essencial deve ser limitada e visível. Nenhum resultado financeiro pode ser declarado completo ou atual sem confirmação da API.

**Arquitetura a caracterizar antes de implementar:**
1. Validar usuário, workspace e autorização no backend. **Nunca iniciar prefetch financeiro antes da autorização.**
2. Ler manifesto de versão/revisão/capacidades, identificadores de workspace, catálogos pequenos, resumo, fluxo, benefícios, cartões e eventos necessários **somente para o período inicial**; manter cada fonte canônica independente, incluindo status de disponibilidade/erro e endpoints 404 não implantados.
3. Reutilizar leituras já realizadas entre sessão, Home e Lançamentos por cache temporário em memória com chave composta `owner+workspace+escopo+período+revisão do modelo`, com coalescência de GETs iguais e invalidação em logout/troca de conta/alteração financeira/sync. Não colocar JWT ou dados financeiros em `localStorage` permanente; não compartilhar cache entre titulares.
4. **Todos os períodos devem ser acessíveis, mas não significa descarregar todos os eventos e todos os meses no login.** Períodos diferentes devem ser consultados sob demanda, com paginação/consulta agregada canônica e armazenamento temporário somente de resultados já autorizados. Pré-busca adjacente é opcional e condicionada a orçamento de tráfego medido, tempo de resposta e autorização de fase própria.
5. Enquanto a API estiver fria ou indisponível, indicar o estado real e permitir recuperação de sessão sem mostrar como atual um valor antigo; impedir travamento indefinido e a falsificação de `0,00`. O login não deve depender de endpoints opcionais que retornam 404 hoje.
6. Em telas históricas com volume maior, exigir estratégia de leitura paginada/autorizada antes de ultrapassar o limite existente de snapshot de 5.000 eventos ativos; arquivados permanecem fora do contrato operacional atual. Não adicionar writers, nem calcular saldo/fatura/status no cliente.

**Gates de aceitação futura:**
- Comparação observável de login→primeiro conteúdo canônico útil e login→painel essencial disponível, com serviço quente e frio, em conexão móvel e desktop, sem metas numéricas presumidas.
- Instrumentação de latência por rota (p50/p95 quando disponível), quantidade de requests, bytes transferidos reais por sessão, consulta de períodos mês/ano/range/todo ativo, cache hit/miss e invalidação.
- Teste de usuário A/B, múltiplos workspaces, logout/troca de sessão, concorrência, erros 401/403/404/502 e cancelamento por troca rápida de período.
- Testes de valores exatamente iguais à autoridade financeira, inclusive competência diferente, datas e benefícios, e E2E responsivo. Home e Loading devem obter homologação visual **explícita**.
- Sem mudanças na API produtiva, schema, RLS, índices ou dados sem autorização específica e backup/gates adequados.

## 2. Guardas de custo para Supabase Free e Render Free
- Em 17/11/2026, consulta read-only do Supabase: organização `MEG Vilalva` **Free**, projeto `meg-financas` **ACTIVE_HEALTHY**, Postgres 17, região sa-east-1. Estado saudável não prova índice, SQL ou latência adequados.
- Documentação oficial atualizada de Supabase egress: **5 GB não armazenados em cache + 5 GB em cache**, franquias distintas e compartilhadas por todos os projetos da organização; consultas de DB pela API/pooler consomem egress não armazenado em cache. Referência: https://supabase.com/docs/guides/platform/manage-your-usage/egress . O uso real do ciclo de faturamento **NÃO foi obtido** pelas ferramentas nesta consulta; não supor margem disponível. O plano Free não oferece cobrança de excesso como Pro; existem políticas de restrição/grace period ao exceder limites.
- Antes de ativar prefetch persistente ou por período, medir bytes por resposta e uso real no painel Usage da organização, limites de serviços, consumo por projeto e impacto de requisições; usar estimativa conservadora separada de medição real e condicionar qualquer prefetch a margem confirmada, limitador de concorrência e abortos.
- Evitar carregar histórico completo no login, polling agressivo, repetição simultânea de requests, downloads sem seleção de colunas, `no-store` desnecessário para catálogos estáveis e revalidar preferências do navegador sem guardar dados financeiros sensíveis.
- Cotas podem mudar: conferir fontes oficiais/Usage antes de executar. Qualquer gasto, upgrade, novo serviço ou alteração de plano requer aprovação específica.

## 3. O que foi de fato verificado (sem confundir diagnóstico com otimização)
### Render
- Logs do serviço existente `meg-platform-api` inspecionados em 16/11/2026 registraram várias respostas de endpoints da Home entre **~2 e ~7 segundos**. A Web anterior esperava `Promise.all` de nove requests; o gateway repetia validação `/auth/me` para chamadas paralelas.
- Código da Web/gateway alterado e testado **na preview Free isolada**: renderização progressiva da Home, coalescência de validação de token no gateway. Commit funcional `5ab84c803d106f5087201e6d491c1e6f247ca4f7`, CI #43911259330 SUCCESS, deploy `dep-dbtj8688v5cc7395u42g` LIVE, smoke público pós-deploy #43911259443 attempt 2 SUCCESS.
- Métricas Render disponíveis na janela analisada mostram CPU e memória; as séries estruturadas de `http_latency` e `http_request_count` estavam vazias, portanto **não existe p95 real validado**. Não houve otimização SQL do banco ou da API produtiva.

### Supabase
- Em 17/11/2026 foram consultados somente `list_projects`, `get_organization`, `get_project` e **Performance Advisors** do projeto produtivo, todos em modo somente leitura. Advisor retornou **9 FKs sem índice de cobertura** e **13 índices com uso não observado**. Este resultado indica itens para diagnóstico, não identifica a causa da demora da Home nem aprova criar/apagar índices. Exemplo: `CardPurchase.categoryId`, `Payable.categoryId` e outros; alguns índices marcados sem uso podem ser essenciais em rotinas pouco frequentes.
- As avaliações da Etapa 09 sobre Usage/Egress foram históricas e são distintas da medição atual de desempenho SQL. Não foram consultados consumo acumulado atual, `pg_stat_statements`, planos EXPLAIN, slow queries ou custo por rota no banco produtivo nesta entrega.
- **Não houve mudança, query SQL no banco de produção, `EXPLAIN ANALYZE`, `CREATE INDEX`, `DROP INDEX`, migração, atualização de RLS nem alteração de recursos Supabase.**

## 4. Próxima execução autorizável, sem alterar produção
**Gate diagnóstico somente leitura proposto para Etapa 10:** obter baseline real da sessão (Chrome Performance + métricas por rota e bytes, sem token/PII), analisar top queries/indices pelos mecanismos de observabilidade permitidos e dados QA isolados, cruzar o custo da consulta da Home com banco. Atualizar orçamento real de egress com evidências do Billing/Usage da organização, e só então projetar prefetch condicionado e separação estática, com testes e aceite visual. Não avançar para Etapa 11.

## 5. Estado e restrições
- **Registro concluído; implementação pendente.** São melhorias propostas, não promessas de ganho de tempo nem aprovação de nova tela.
- Android congelado; manter arquitetura financeira canônica, prints soberanos, Home e demais telas homologadas, qualidade e isolamento; PR #696 permanece Draft e não mesclada.
- Não criar hospedagem estática ou serviço adicional, modificar API e banco real, gastar, promover, publicar ou realizar merge sem gate e autorização específica.
