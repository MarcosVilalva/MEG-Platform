# MEG Finanças Web Evolution | Etapa 09
## Gate 1: inspeção somente leitura dos serviços gerenciados no sandbox Supabase
**Data-base:** 12/11/2026. **Estado: PARCIAL / NO-GO para Gate 2.** Documento operacional, não atestado de configuração completa.

### 1. Alvo imutável e limites
- **Único alvo autorizado:** `meg-stage09-restore-sandbox-20261112`, ref `oxwmqbzeuiibdlkcbjzv`, org `MEG Vilalva`, PostgreSQL 17, região `sa-east-1`, Free.
- **Origem expressamente fora de escopo:** `ugbiqzaqnrhulhetevby` (`meg-financas`), sem novas consultas ou alterações.
- **Inativo e não reutilizável:** `dmrauztnozvxirbydtho` (`meg-evolution`).
- **Dashboard do alvo:** https://supabase.com/dashboard/project/oxwmqbzeuiibdlkcbjzv
- Preservar Android, Web homologada, Render, banco WSL `meg_restore_drill`, recuperação `age` offline e criptogramas de backup/Vault. Issues #674 e #676 abertas. PR #666 deve permanecer Draft.
- **Somente clicar para visualizar** configurações. NÃO usar botões `Save`, `Enable`, `Disable`, `Create`, `Delete`, `Test`, `Send`, `Generate` nem qualquer ação de escrita. Não criar usuário fictício, não restaurar, não importar dados, não instalar extensões, não executar SQL de escrita, não usar PUT no Vault.
- Não copiar tokens, keys, JWT, senha, chave-raiz, URL privada completa, destinatários, payloads, template com dados sensíveis, headers ou imagens contendo segredos para chat/Git/issues. Se precisar registrar configuração, usar apenas **SIM/NÃO/NÃO VERIFICADO**, classe de domínio e contagem de redirecionamentos.

### 2. O que já foi comprovado (não repetir)
Leituras do conector Supabase e queries SQL `SELECT` só no sandbox: projeto `ACTIVE_HEALTHY`; zero relações/funções em `public`, zero usuários Auth, zero provedores SSO/SAML e clientes OAuth *cadastrados*, zero triggers não internos Auth e rotinas com nomes de hooks, zero buckets/objetos/policies Storage, zero Edge Functions e migrações de aplicação, `pg_net`/`pg_cron` não instalados, zero foreign servers e tables e zero tabelas em publicação Realtime. Publicação `supabase_realtime` e gatilho `tr_check_filters` são infraestrutura interna; 11 triggers do próprio schema Storage e seis event triggers DDL de extensões existem. `Security Advisor` e `Health Advisor` retornaram `lints=[]`.
**Limites:** ausência de objetos no PostgreSQL não revela o que está habilitado no GoTrue, o serviço de e-mail/SMS, URIs de callback, hooks externos nem conexões em runtime. Ausência de alerta não comprova isolamento.

### 3. Matriz de inspeção do Dashboard (sem mudanças)

| Área a abrir exclusivamente no projeto-alvo | O que deve ser lido e registrado, sem valor secreto | Evidência nesta rodada | Condição para levantar o bloqueio |
| --- | --- | --- | --- |
| Authentication > Sign In / Providers | Email ativo? Phone ativo? Anonymous ativo? OAuth/OIDC/SSO algum habilitado? Nome genérico do tipo, sem client ID/secret | **NÃO VERIFICADO** | Nenhum provedor com comunicação a terceiro real sem protocolo isolado explícito; login não precisa ser ativado para este gate |
| Authentication > SMTP / Email | SMTP customizado ligado? Envio padrão disponível? Send Email Hook ativo? Não exibir host/usuário/senha | **NÃO VERIFICADO** | Demonstrar que fixtures futuras não enviariam e-mail real. O SMTP padrão do Supabase ainda pode atender destinatários da equipe |
| Authentication > Phone / SMS | Fornecedor configurado? SMS ativo? Test numbers? Não reproduzir números ou credenciais | **NÃO VERIFICADO** | Sem rota de SMS real acionável pelo ensaio |
| Authentication > URL Configuration | Site URL aponta somente a ambiente de ensaio/local? Redirect allowlist contém origem produtiva? Registrar quantidade e classe dos domínios, sem valores | **NÃO VERIFICADO** | Nenhum callback que conduza testes para produção; não cadastrar URL agora |
| Authentication > Hooks e templates | Hooks habilitados? Tipo HTTP/PG/Edge? Endpoint externo configurado? Templates com links de produção? Registrar só presença e classe | **NÃO VERIFICADO** | Nenhum hook/evento de ensaio capaz de atingir serviço externo real |
| Storage > Buckets / Policies / Settings | Confirmar zero buckets e policies; verificar se existe integração/política externa adicional; não criar objetos | **Zero buckets/policies no DB; demais NÃO VERIFICADOS** | Sem destino externo ou bucket compartilhado/ligado a produção |
| Realtime / Publications / Settings | Zero tabelas em publications já verificado; conferir configurações e presença de canais/assinantes externos, se Dashboard expuser | **Publication sem tabelas; runtime NÃO VERIFICADO** | Ensaios futuros apenas com canais de teste isolados e sem assinantes reais |
| Integrations, Webhooks, Database settings e conexões | Enumerar presença de integrações externas, triggers de envio, HTTP, cron, conexões com Render e endpoints reais. Não usar `Connect` para conectar | **SQL sem pg_net/cron/FDW; plataforma egress NÃO VERIFICADOS** | Nenhuma ligação conhecida a infraestrutura produtiva ou notificação real |
| Project Settings / API / Security | Identidade exata do projeto, URLs de ambiente sem reproduzir valores; verificar conexões/segredos configurados apenas por presença | **ID/projeto verificados; configurações NÃO VERIFICADAS** | Não expor keys e não cadastrar credenciais |
| Usage / Egress | Visualizar orçamento/cotas e confirmar que não se criou serviço faturável; sem alterar plano | **Custo Free aprovado R$0; consumo novo NÃO VERIFICADO** | Não avançar com custo ou restrição inesperada |

**Importante:** Database > Network Restrictions trata fundamentalmente restrições de acesso **ao banco**; não deve ser apresentada como bloqueio universal de egress dos serviços Auth, Storage ou Realtime.

### 4. Caminho alternativo de somente leitura
A documentação oficial fornece `GET /v1/projects/{ref}/config/auth` (permissão `auth_config_read`) e o endpoint Alpha `GET /v2/projects/{ref}/config` (permissões amplas de leitura). Tais respostas podem incluir campos sensíveis ou metadados restritos. **Não executá-los nesta fase por falta de conector autorizado especificamente para esses campos; não criar nem fornecer PAT, não imprimir JSON bruto e não tentar contornar acesso.** Uma eventual coleta futura exige novo procedimento auditado, escopo mínimo, saída somente indicadores sanitizados e custódia do token em terminal privado. O caminho preferencial imediato é inspeção visual read-only no Dashboard autenticado do sandbox.

Fontes oficiais consultadas: https://supabase.com/docs/reference/api/v1-get-auth-service-config ; https://supabase.com/docs/reference/api/v2-get-project-config ; https://supabase.com/docs/guides/auth/general-configuration ; https://supabase.com/docs/guides/auth/auth-smtp ; https://supabase.com/docs/guides/platform/network-restrictions ; https://supabase.com/docs/guides/storage .

### 5. Decisão do Gate
- **PASS parcial documentado:** identidade do destino, ausência de dados MEG, ausência de automações `public` e extensões de saída HTTP/cron, sem buckets/objetos, advisor sem alertas.
- **Não comprovado:** isolamento de Auth Providers, SMTP/SMS, URLs, redirects, hooks, Storage/Realtime runtime, serviços de egress e conexões externas da plataforma.
- **Decisão:** `GATE1=PARCIAL`, `GATE2=NO-GO`, `GATE3=NO-GO`, `GATE4=NO-GO`. Sem novos dados, restore, Vault PUT, merge ou deploy.
- **Próximo passo operacional exato:** abrir Dashboard do alvo `oxwmqbzeuiibdlkcbjzv` com uma sessão autorizada e completar a matriz em modo leitura, com evidências sanitizadas. Caso um item não possa ser demonstrado, registrar `NÃO VERIFICADO` e manter gate fechado. Não classificar ausência de egress apenas porque não houve evento observado.

### 6. Limites da entrega
Este documento foi preparado no repositório, não prova visita autenticada às telas do Dashboard, não altera configuração do Supabase e não aprova a execução do Gate 2. A etapa permanece aberta. Testes técnicos de CI são independentes de validação visual da Web.
