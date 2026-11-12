# MEG Finanças Web Evolution | Etapa 09
## Plano verificável de recuperação dos componentes gerenciados do Supabase | 12/11/2026

**STATUS: PREPARAÇÃO / SOMENTE LEITURA. NÃO EXECUTADO UM RESTORE GERENCIADO. NENHUM PROJETO NOVO CRIADO.**

Documento operacional da PR #666 Draft. Autoridade financeira: `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; checkpoint: `MEG-WEB-CONTINUIDADE-OFICIAL.md`; runbook: `docs/MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md`. Esta especificação não substitui o checklist de isolamento da infraestrutura nem a autorização de custo para o projeto-alvo.

### 1. Escopo aprovado e limites

- Autorização do operador em 12/11/2026: `AUTORIZADO, SEGUIR`, após proposta de preparar ensaio de recuperação integral com decisão de custo e criação de destino. Trata-se de anuência para prosseguir com a **Etapa 09**; não especifica nome/ID de destino novo, teto financeiro, cobrança, alteração de produção, API, Render, merge ou deploy. Não executar etapa faturável antes de confirmar custo real no Supabase e aceite de valor/teto.
- **Origem:** `meg-financas` / `ugbiqzaqnrhulhetevby`, organização `MEG Vilalva` (`gkvlezwigvinfcbsemjx`), região `sa-east-1`, PostgreSQL 17, status `ACTIVE_HEALTHY`. **Nunca usar ref de origem como destino.**
- `meg-evolution` / `dmrauztnozvxirbydtho` aparece `INACTIVE` na mesma organização. **Não apagar, reativar, renomear, vincular ou reutilizar como destino** sem escopo e autorização próprios; o estado `INACTIVE` não prova que ele está vazio ou liberado para ensaio.
- Plano organizacional `free` confirmado via metadata Supabase. A documentação vigente permite até **2 projetos Free ativos**, com condições de cota por owner/admin; um inativo não basta, por si só, para declarar vaga/custo zero confirmado. Não autorizar upgrade, cartão, cobrança ou projeto adicional no escuro.
- Proibido importar dados reais de origem para ambiente que possa ser alcançado por aplicação/serviço produtivo. Preferir fase 1 completamente sintética, e somente depois ensaio de recuperação real sob sub-gate específico, regras de privacidade e endpoint-alvo autenticado.
- Banco local `meg_restore_drill` do WSL fica intocado; nenhuma execução do script de restore remoto nele. Android e Web homologada imutáveis. PR #666 permanece Draft sem merge.

### 2. Estado verificado, fontes e lacunas

| Componente | Evidência atual | Próximo controle seguro |
| --- | --- | --- |
| Banco `public` | Backup real criptografado `age`; 32 tabelas restauradas no PostgreSQL 17 isolado; integridade referencial e testes financeiros sintéticos anteriores | Só comparar com destino futuro depois de quarentena e autorização; nunca reimplementar regras |
| Vault | 1 linha em `vault.secrets` no inventário anterior; GET raiz real salvo em criptograma `age` e manifesto; download OneDrive Web e hashes OK; identidade age USB offline | Testar *primeiro* um segredo fictício no destino; migrar root key original apenas em destino autorizado, com risco da sobrescrita explicitado |
| `auth` | 27 tabelas inventariadas, 0 usuários no inventário anterior | Verificar schema gerenciado, autenticação/sessão com usuário fictício e settings sem providers externos reais |
| Storage | 10 tabelas gerenciadas, inventário anterior de buckets/objetos **zero** | Teste de upload/download/delete apenas de objeto fictício em bucket de teste do destino; verificar bytes, ACL, RLS; não presumir que dump SQL inclua blobs |
| Edge Functions | Consulta `list_edge_functions` em 12/11/2026 retornou **0** functions publicadas | Verificar scripts/fonte no repositório, não recriar funções ou webhooks sem necessidade |
| Extensões | Consulta `list_extensions`: 7 instaladas. `pg_net` 0.20.3 (`public`), `pg_cron` 1.6.4 (`pg_catalog`), `supabase_vault` 0.3.1 (`vault`), `pgcrypto` 1.3, `uuid-ossp` 1.1, `pg_stat_statements` 1.11, `plpgsql` 1.0 | Validar disponibilidade/versionamento do destino; **não reexecutar agenda, watchdog, net/webhooks**, #676 permanece aberta |
| Migrations | Consulta `list_migrations`: **7** versões de 12/09 e 19/09/2026, ligadas a catálogo, materialização, backfill e endurecimento RLS/Data API | Inventariar histórico e confrontar com SQL/migrations versionadas; não executar retroativamente migração com backfill sem revisão |
| RLS/permissões | Auditoria **somente leitura já concluída**: 32/32 `public` com RLS, zero policies e zero grants diretos a anon/authenticated; Auth/Storage/pg_net analisados | Teste de **negação por padrão** no destino com identidades fictícias; não inventar políticas nem repetir auditoria produtiva |
| Realtime, cron, publication, webhook, settings | Não homologados integralmente | Inventário sem execução de jobs, plano de desativação de integrações e ensaio isolado |
| Render/API | Build Command possivelmente destrutivo, Egress limitado; #674 writer financeiro e #676 pg_net/watchdog | Não configurar app de produção para destino; smoke de API deve ter URL fictícia ou stack de teste explicitamente isolada |

**Limitação:** os inventários consultados são um ponto no tempo. Não houve leitura de valores secretos, registro financeiro individual, conteúdo Storage ou execução de comandos SQL nesta preparação.

### 3. Alternativas oficiais, custo e decisão técnica

**Alternativa A, clonagem física `Restore to a New Project`: REPROVADA para este ensaio agora.** Requer plano pago e backup físico habilitado; cria novo projeto e copia também root key. A documentação oficial alerta que `pg_cron` e `pg_net` podem entrar em execução assim que a clonagem termina, sem janela para suspender previamente. Há risco de chamadas externas e alterações indevidas. Não usar.

**Alternativa B, projeto novo vazio + migração lógica controlada: PROPOSTA.** Criar destino **não produtivo** somente após verificar cota/custo na organização e confirmar ausência de vínculos; iniciar com testes fictícios e rotas externas deliberadamente bloqueadas. O dump de `public` já existente foi preparado para restore local estrito e **não é importador remoto Supabase**. É necessário planejar uma ferramenta separada, revisada, para destino novo com allowlist inequívoca, checagem de projeto/host, estrutura gerenciada e salvaguardas contra execução de integrações. Não reutilizar `scripts/meg-stage09-safe-restore-drill.sh` para remoto.

**Custos vigentes (fontes oficiais em 12/11/2026):** Free tem até 2 projetos ativos, limite DB 500 MB/projeto e recurso de pausa por inatividade. Pro começa em **US$ 25/mês**, com compute adicional a partir de cerca de US$ 10/mês por projeto Micro e cobrança por uso, quando aplicável. **Isto NÃO é cotação ou autorização da conta**. Confirmar por `get_cost` para organização fornecida/confirmada pelo operador e aprovar limite máximo antes de criar. Não alterar a organização Free para Pro automaticamente.

Fontes: https://supabase.com/docs/guides/platform/billing-on-supabase ; https://supabase.com/docs/guides/platform/billing-faq ; https://supabase.com/docs/guides/platform/compute-and-disk ; https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/clone-project ; https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore ; https://supabase.com/changelog.md .

### 4. Gates obrigatórios e ordem de execução

**Gate 0, anterior a qualquer criação:**

- [x] Confirmar organização Free e projeto original ativo, sem efeitos colaterais (12/11/2026).
- [x] Localizar segundo projeto existente `meg-evolution` INACTIVE; preservá-lo.
- [x] Revalidar inventário não secreto de Edge Functions, extensões e migrations sem SQL de produção.
- [ ] Obter custo **específico do Supabase** e elegibilidade do terceiro projeto/segunda vaga Free; se a conta não permitir Free, não executar upgrade/cobrança.
- [ ] Fixar nome e identificador do novo projeto separado. Nome **proposto**: `meg-stage09-restore-sandbox-20261112`; nunca reutilizar `meg-evolution` nem o banco WSL. Região **proposta** `sa-east-1` para isonomia, sujeita à revisão de disponibilidade/preço.
- [ ] Confirmar explicitamente custo final, teto e permissão de criação do **destino específico**. Sem isso: `NO-GO_CREATE`.

**Gate 1, provisionamento isolado (somente após Gate 0):**

- [ ] Criar um projeto vazio com configuração padrão segura, sem conexões de produção e sem cargas de dados reais.
- [ ] Registrar seu ref, ambiente, plano, versão PG e link no checkpoint. Guardar senhas/keys de projeto fora Git/chat, nunca em logs.
- [ ] Validar identidade do endpoint de **destino** e não exposição a `Render`, Android, Web, scheduler e integrações reais. Testar somente comandos explicitamente autorizados com dados fictícios.

**Gate 2, caracterização gerenciada com fixtures 100% fictícias:**

- [ ] Auth: criar conta de teste fictícia sem emails/sms externos, confirmar sessão, expiração, revogação e regras de acesso esperadas.
- [ ] Storage: bucket isolado de teste, objeto fictício com hash de bytes e negação a papéis não autorizados; não clonar dados Storage de produção.
- [ ] Vault: no destino, criar e recuperar segredo **fictício** sob chave nova padrão, sem usar root key original.
- [ ] Realtime: somente canal/publicação fictícia e assinante de teste; sem assinar tópicos de produção.
- [ ] Extensões: registrar versões comparadas; `pg_net`, `pg_cron` e watchdog devem permanecer sem jobs ativos/URLs reais no destino. #676 exige revisão antes de qualquer mudança produtiva.
- [ ] RLS/grants/Data API: negar acessos diretos anônimos/não autorizados; não restaurar grants excessivos ou funções `SECURITY DEFINER` sem análise.
- [ ] API/financeiro: smoke isolado com autenticação fictícia, sem apontar ambiente de produção para o destino; preservar os 32 objetos e a autoridade financeira canônica sem cálculos paralelos.

**Gate 3, desenho da restauração lógica real (NÃO AUTORIZADO EXECUTAR POR ESTE DOCUMENTO):**

- [ ] Demonstrar inspeção do dump `age` e catálogo sem plaintext persistente, com guardas de **destino somente**. O arquivo atual de restore rejeita destinos remotos e não será afrouxado.
- [ ] Identificar como migrar os objetos customizados de `auth`/`storage` sem substituir schemas gerenciados; consultar guia oficial da CLI v3 e `--remote`, evitando comandos que toquem a origem inadvertidamente.
- [ ] Se dados de origem forem necessários, aprovar finalidade, minimização, acesso e retenção. Executar restore apenas em destino vazio com listas de objetos allowlisted, sem cron e sem egress externo, logs saneados e rollback documentado.
- [ ] Para testar decifragem de **dados Vault antigos** em migração lógica, a documentação oficial exige a chave-raiz original no **projeto novo**. Isso envolve PUT **somente no destino novo e vazio**, que pode invalidar qualquer dado já cifrado sob chave anterior. Portanto, preparar este passo somente depois de testar em subambiente descartável e receber autorização específica sobre a troca da raiz no destino. **PUT na origem é terminantemente proibido.**
- [ ] Exigir verificação de segurança e contagem/consistência de `public`, funções/visões, relações, transações financeiras e negabilidade de acesso; comparar com auditorias já concluídas e não confiar apenas no status SQL.

**Gate 4, validação e aceites separados:**

- [ ] Evidências e status por componente (técnico, segurança, funcional, visual quando pertinente). Um CI verde ou `pg_restore` exit 0 não significa aprovação de usuários, permissões ou Vault.
- [ ] Testes operacionais de perda, recuperação, permissões e tempo com métricas reais de RTO; definir RPO e frequência a partir de riscos e orçamento aprovados. Não inventar RPO/RTO nem SLA.
- [ ] Sem vincular aplicações reais, sem Render Deploy, sem mudar DNS/URL; nenhuma promoção para produção sem nova autorização e plano rollback.
- [ ] Aprovação visual explícita quando houver UI, não deduzir a partir de CI.

### 5. Matriz de aceite e evidências exigidas

| Teste | Critério mínimo | Estado 12/11/2026 |
| --- | --- | --- |
| Integridade backup PostgreSQL criptografado | manifesto SHA e decrypt, restore local isolado 32 tabelas | PASS anterior limitado a `public` |
| Recuperação offline da identidade age | USB cifrado, canário/prova e custódia física desconectada | PASS por relatório e atestado operador |
| Vault root key offsite | criptograma + manifesto baixados da nuvem, hashes iguais | PASS por relatório e atestado operador |
| Projeto destino Free/paid | projeto **novo**, diferente dos 2 já existentes, custo aprovado | PENDENTE |
| Auth gerenciado | sessão fictícia e negação a acessos não autorizados | PENDENTE |
| Storage | bytes fictícios, ACL e download verificados | PENDENTE |
| Vault gerenciado | segredo fictício e, separadamente, leitura segura de segredo migrado | PENDENTE |
| Extensions + Cron + `pg_net` | sem evento externo, sem cron real disparado | PENDENTE |
| Realtime/Edge Functions/settings | smoke seguro e configs recriadas por revisão | PENDENTE |
| Financeiro canônico/segurança | testes idempotência/atomicidade/RLS/segregação sem dados alterados na origem | PENDENTE no destino |
| PITR, backup recorrente, RPO/RTO | critérios explícitos e execução periódica aprovada | PENDENTE |

### 6. Bloqueios e protocolo de incidente

- Se o Supabase indicar cobrança ou inexistência de vaga Free, **parar**. Não renovar token administrativo do Vault, não reativar `meg-evolution`, não apagar projeto antigo e não migrar de plano para contornar o bloqueio.
- Se qualquer job puder disparar email, webhook, HTTP externo, Realtime ou escrita financeira, **parar** antes de restaurar schema/dados; não tentar desativá-lo *depois* da restauração.
- Em erro de destino, abortar e preservar artefatos/manifestos e registros sanitizados; não executar `DROP SCHEMA`, `TRUNCATE`, substituição de chave ou script de limpeza em ambientes existentes.
- Se a origem/destino estiverem ambíguos, nenhum comando de escrita remota é permitido. Separar identificadores de projeto e usar allowlist imutável para **projeto novo**.
- Issues existentes: #674 (ledger) e #676 (`pg_net`/watchdog) permanecem no backlog, sem correção automática nesta etapa.

### 7. Resultado desta sessão e próximo gate exato

**Feito:** leitura do checkpoint/runbook/autoridade financeira, revisão da documentação oficial, consulta read-only de organização/projetos/Edge Functions/extensões/migrations. **Não feito:** criação do sandbox, retorno de cotação específica da organização, restore real, configuração de componentes gerenciados ou ensaio funcional de produção. **Autorização de prosseguimento registrada**, mas a autorização de custo/ambiente permanece não documentada.

**Próximo gate:** identificar com o usuário o custo máximo aceitável **e o escopo do projeto-alvo**, consultar custo real no Supabase antes de criar e só então criar projeto *novo* isolado se elegível e expressamente aceito. Não prosseguir diretamente do plano documental para um dump remoto.

Fontes principais consultadas em 12/11/2026: Supabase Billing FAQ, Pricing, Compute and Disk, Restore to a New Project, Backup and Restore using CLI, Changelog CLI v3, e evidência de metadata obtida pelas consultas read-only do projeto.
