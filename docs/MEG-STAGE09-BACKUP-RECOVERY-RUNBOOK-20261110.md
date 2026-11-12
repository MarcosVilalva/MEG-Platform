# MEG Web Evolution | Etapa 09 | Backup e recuperação, plano executável

**Preparado em 10/11/2026, revisado em 11/11/2026. Status: CANDIDATO / NO-GO PARA PRODUÇÃO.** Procedimentos e testes com ferramentas simuladas não substituem dump efetivo e recuperação real. Nenhuma senha, chave privada ou dado de usuário deve ser anexado ao GitHub, ChatGPT, issues, logs ou capturas.

> **CORREÇÃO DE SEGURANÇA APÓS AUDITORIA DO WORK (11/11/2026):** não usar pacotes/scripts locais anteriores à revisão da PR #666. O backup agora exige `PGSSLMODE=verify-full` + CA oficial; o restore usa **exclusivamente socket Unix `/var/run/postgresql`**, com autenticação do processo PostgreSQL e sem aceitar túnel TCP. O script Vault interpreta o campo JSON `root_key` documentado. **NO-GO PARA PRODUÇÃO** enquanto CI final, simulação local e requisitos de recuperação efetiva não estiverem comprovados. O ZIP gerado anteriormente foi superado pela versão do GitHub.

## 1. Escopo verificado na produção (somente leitura)

- Organização Supabase: `MEG Vilalva` (`gkvlezwigvinfcbsemjx`), projeto `meg-financas` (`ugbiqzaqnrhulhetevby`), PostgreSQL **17**, região `sa-east-1`, plano **Free**. O painel Usage acusou restrição por Egress no ciclo iniciado em 27/10/2026. O metadado `ACTIVE_HEALTHY` da API Management não prova que requisições da aplicação estejam disponíveis.
- **32 tabelas em `public`** (aprox. 18 MB ocupados), **2 registros em `public."User"`**: a autenticação do MEG fica no seu próprio domínio, não no Supabase Auth. Há **27 tabelas internas no schema `auth`, mas zero registros em `auth.users`**. Há **0 buckets e 0 objetos** em Supabase Storage no momento da consulta.
- **1 registro no `vault.secrets`**, **7 extensões** instaladas. Não foram consultados nem extraídos conteúdo de registros, hashes de senhas, segredos ou valores financeiros.
- O Supabase **Free não possui backups automáticos gerenciados**. Antes desta etapa, nenhum backup externo/restauração isolada estava comprovado. O GitHub não contém workflow específico de backup.
- O Build Command do Render `meg-platform-api` ainda contém etapas capazes de modificar o banco (`db:prepare:production` e `db:push:production` com `--accept-data-loss`). **Não executar merge/deploy até sanar o risco.**

## 2. O que este kit protege e o que ele NÃO promete

Arquivos nesta PR:

1. `scripts/meg-stage09-safe-backup.sh`: exportação **lógica completa do PostgreSQL com `pg_dump`**, formato custom, enviada diretamente ao **age** por pipe. Nenhum dump SQL aberto é escrito no disco. Um manifesto com SHA-256 do arquivo criptografado e inventário é gerado. Inclui esquemas gerenciados **somente na medida em que o usuário PostgreSQL tiver leitura e o `pg_dump` os incluir**. Dump de schemas internos **não é** automaticamente restaurável em outro Supabase.
2. `scripts/meg-stage09-safe-restore-drill.sh`: valida SHA-256 e descriptografa em fluxo, restaurando **apenas o schema `public`** em banco PostgreSQL **exclusivamente local** (socket Unix de PostgreSQL 17 em `/var/run/postgresql`, database `meg_restore_drill`). O script exige socket pertencente ao processo PostgreSQL, verifica que a conexão efetiva é Unix e recusa banco com objetos prévios em quaisquer schemas não sistêmicos. Compara 32 tabelas (ou o número encontrado durante a exportação) e exige registros presentes em `User`, `AppState` e `FinancialEvent`.
3. `scripts/meg-stage09-safe-vault-rootkey.sh`: salvaguarda opcional e separada da **chave-raiz criptográfica** usando apenas GET da Management API oficial. O token é lido exclusivamente do terminal privado, a chave nunca é exibida e é imediatamente criptografada com `age`. **Nenhum segredo real foi acessado neste trabalho.**
4. `scripts/meg-stage09-backup-safety.test.mjs`: testa o controle de fluxo e bloqueios com **ferramentas simuladas e dados fictícios**, nunca com produção. A workflow também executa um ensaio de **PostgreSQL 17 real, mas com dados inteiramente sintéticos e bancos descartáveis**, verificando `pg_dump` → `age` → `pg_restore`. **Nenhum desses testes comprova restauração dos dados verdadeiros do MEG.**

**Cobertura ainda pendente após rodar o kit:** chave-raiz de criptografia do Supabase Vault; senhas dos papéis customizados; segredos de ambiente do Render, chaves de autenticação da API, variáveis operacionais e credenciais externas; objetos Storage futuros; settings, extensões e ajustes de schemas gerenciados; restauração realmente funcional em um **novo projeto Supabase isolado**. Não confundir um dump existente com um plano integral de recuperação.

## 2.1 Incidente da primeira exportacao real e verificacao corrigida (11/11/2026)

- **Autorizacao explicita recebida para uma unica exportacao real**, exclusivamente por leitura. A execucao WSL iniciou em 11/11/2026 as 19h13 (horario local), autenticou no Session Pooler IPv4 com TLS `verify-full`, confirmou 32 tabelas `public`, executou `pg_dump | age`, mas **falhou na validacao local `age -d | pg_restore --list`**. Relatorio final 19h15: `CODIGO_SCRIPT_BACKUP=1`, `CODIGO_LINUX=2`, temporarios excluidos, **nenhum backup real validado nem preservado nesta tentativa**. Sem restore, Vault, merge ou deploy.
- **Hipotese tecnica reproduzida em ambiente isolado:** o `pg_restore --list` pode consumir somente o catalogo TOC e encerrar a leitura antes de `age` terminar de transmitir os dados, causando `EPIPE/SIGPIPE` e erro sob `pipefail`. O stderr original estava em pasta temporaria excluida; **nao ha prova conclusiva de que esta tenha sido a causa especifica na primeira tentativa**.
- **Correcao na PR #666 Draft, sem acesso a producao:** o script de backup agora lista o TOC, drena o restante de stdin ate EOF para completar a autenticacao `age` e registra apenas os codigos de saida `AGE_RC`, `CATALOGO_RC` e `DRENO_RC` em eventual falha. Continua sem escrever SQL descriptografado em disco.
- **Testes offline:** contrato com stream sintetico de 8 MiB e consumidor de catalogo que encerra cedo; recusa autenticacao falsa. Job PostgreSQL17 sintético com `age` real aceita arquivo integro e rejeita copia truncada. Evidencia: [Backup Safety #43111816421](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43111816421), SUCCESS, commit de testes `487d86dc7b75957874f548cbd862c4317be362a7`. Testes e CI nao substituem o novo backup real nem prova de restauracao.
- **Atencao ao operador:** o WSL ainda tem a versao ANTERIOR em `/home/m_vil/.meg-stage09-tools/meg-stage09-safe-backup.sh`, cujo Git blob era `c0fb475ac0b346addb725142746e3d873d56068e`. O PowerShell `MEG-ETAPA09-BACKUP-REAL-CONTROLADO.ps1` da primeira tentativa confere rigidamente esse blob. **Nao reutilizar o PowerShell nem executar novo pg_dump antes de instalar a versao corrigida mediante hash conferido e revisar o wrapper.** Nunca afrouxar ou remover o controle do hash.
- **Escopo de autorizacao:** a primeira autorizacao ja foi consumida pela tentativa de 19h13. A correcao e os testes locais/CI nao autorizam uma segunda exportacao real; obter autorizacao especifica antes de nova tentativa. Manter gates de Vault, offsite, restauracao real, Render e Egress.

## 3. Pré-requisitos no PC ou runner privado

- Bash com `pipefail` (Linux, WSL ou Git Bash), Git, utilitários GNU (incluindo `sha256sum`). **Nunca** executar no GitHub Actions com logs/artefatos reais de produção. **No WSL**, mantenha o backup e a identidade `age` em diretórios privados `0700` no filesystem Linux, não em `C:\` ou `/mnt/c`.
- Cliente **PostgreSQL 17** para `psql`, `pg_dump` e `pg_restore`, compatível com a instância original.
- Utilitário **age** com `age-keygen`, para criptografia de chave pública. A identidade de descriptografia é secreta.
- Um diretório **fora do repositório**, preferencialmente montado em volume seguro e sincronizado com uma conta de nuvem distinta do Supabase (por exemplo, uma pasta com sincronização independente ou drive externo). O script salva o arquivo criptografado ali. Depois, **verificar a transferência efetiva** desse arquivo para outro local.
- Acesso às credenciais PostgreSQL de leitura de `Connect` do Supabase, inseridas **localmente**. Não copiar conexão ou senha para conversa, issue, GitHub Secret sem política autorizada ou terminal compartilhado.

### Preparar par de chaves, uma vez

Executar em máquina privada e diretório seguro **fora do projeto**:

```bash
umask 077
mkdir -p "$HOME/.meg-recovery-keys"
age-keygen -o "$HOME/.meg-recovery-keys/identity.txt"
age-keygen -y "$HOME/.meg-recovery-keys/identity.txt"
```

A última linha exibe apenas a **chave pública**, que começa com `age1`. Guarde a chave privada em gerenciador de senhas ou mídia offline separada, sob controle do responsável pela recuperação. Não deixe a única cópia da identidade de recuperação junto do arquivo criptografado.

### Conexão de leitura ao projeto correto

Copiar os valores **somente do painel Connect do projeto `meg-financas`**. Para conexão direta, o usuário é `postgres`; para Session Pooler é `postgres.ugbiqzaqnrhulhetevby`. O script exige o host desse projeto e **TLS verify-full**, certificado CA oficial baixado em Supabase > Database Settings > SSL Configuration:

```bash
export PGHOST='db.ugbiqzaqnrhulhetevby.supabase.co' # ou o host Session Pooler exibido no painel
export PGUSER='postgres'                            # ou postgres.ugbiqzaqnrhulhetevby, para Pooler
export PGPORT='5432'
export PGDATABASE='postgres'
export PGSSLMODE='verify-full'
export PGSSLROOTCERT="$HOME/.meg-recovery-keys/prod-supabase-ca.crt" # baixar no painel, NUNCA aceitar CA inventada
read -r -s -p 'Senha PostgreSQL (nao aparece na tela): ' PGPASSWORD; echo
export PGPASSWORD

export MEG_BACKUP_DIR='/seu/volume-seguro/MEG-Backups' # caminho REAL escolhido, fora do repositorio
export MEG_AGE_IDENTITY="$HOME/.meg-recovery-keys/identity.txt"
export MEG_AGE_RECIPIENT="$(age-keygen -y "$MEG_AGE_IDENTITY")"

bash scripts/meg-stage09-safe-backup.sh
unset PGPASSWORD
```

**Importante:** o projeto Free está restrito por Egress. Se a conexão PostgreSQL negar o dump, **não rode o comando repetidamente** e não mude plano sem aprovação. Registre o erro sanitizado e avalie o acesso pelo painel.

### Conferência pós-exportação

- O script só declara o **arquivo lógico criptografado** criado quando a exportação e a listagem interna com `pg_restore --list` passam. Ele imprime o caminho do `.pgdump.age` e o manifesto `.manifest.txt`.
- Conferir que o manifesto tem `archive_verified=age_decrypt_and_pg_restore_list`, `public_table_count` coerente, tamanho positivo, hash SHA-256 e anotação `vault_root_key_included=NO`. Se o dump não listar `vault.secrets`, isso é ALERTA adicional, não sucesso pleno.
- Verificar a existência do `.pgdump.age` em armazenamento externo **independente**. Não enviar o dump, chave privada nem URL de acesso ao chat ou ao GitHub.
- Guardar uma cópia íntegra em segunda localização, com controle de acesso. O manifesto, sem segredos, pode ser anexado ao relatório técnico se necessário.

### Atualizacao da verificacao de restore e preflight local (11/11/2026)

- A copia do backup foi validada por hash apos download declarado pelo operador como feito via OneDrive Web: resultado `DOWNLOAD_CLOUD_CONFERIDO_POR_HASH` (20h01); origem remota nao e verificavel tecnicamente por script offline, devendo ser distinguida da evidencia criptografica.
- Revisado `scripts/meg-stage09-safe-restore-drill.sh`: a etapa `age -d | pg_restore --list` agora consome o fluxo descriptografado ate EOF antes de autorizar qualquer restore. O consumidor de catalogo pode terminar antecipadamente, levando a SIGPIPE e falso negativo se `age` ainda estiver lendo dados. A correção nao grava SQL em disco, mantem `pipefail` e recusa archives truncados.
- **Preflight sem qualquer mutacao**, a realizar no Windows PowerShell 5.1, gerado como `MEG-ETAPA09-PREFLIGHT-RESTAURACAO-LOCAL.ps1` (artefato da conversa, nao commitado): verifica checksum e manifesto do arquivo local, autentica exclusivamente via socket Unix/peer com `PGREQUIREPEER=postgres` e `env -i`, confere o servidor PostgreSQL 17 e `meg_restore_drill` vazio, e apenas detecta se o script corrigido esta instalado. Nao usa `pg_dump`, nao le dados financeiros, nao executa `pg_restore`, nao utiliza credenciais remotas.
- Somente depois de preflight aprovado, validar o script local de restore contra blob Git `5946d03f4102068f84d9ebb011aaa199aa1e063b` e obter autorizacao separada para restaurar dados reais no banco local. Jamais executar restore com `PGHOST` remoto, nem reproduzir as senhas no chat.
- O teste sintetico do script no GitHub Actions nao substitui ensaio de restore dos dados reais; os componentes Supabase gerenciados e chave raiz Vault continuam fora da homologacao.

## 4. Ensaio isolado de restauração do domínio financeiro

Em **PostgreSQL 17 local no WSL**, confirme que o servidor atende ao socket `/var/run/postgresql/.s.PGSQL.5432` e pertence ao usuário Unix `postgres`. **Não** use `createdb -h localhost` ou túnel TCP para esta operação.

O script de restore deve ser executado com o **mesmo usuário Unix que possui um papel PostgreSQL local homônimo**, autenticado via peer no socket local. Depois de revisar o alvo, prepare manualmente o papel e crie o banco isolado com estes comandos; **nunca os rode contra servidor remoto**:

```bash
# Estes comandos somente funcionam em PostgreSQL local Unix, sem herdar PGHOST remoto.
local_user="$(id -un)"
sudo -u postgres env -i PATH="$PATH" HOME=/var/lib/postgresql PGREQUIREPEER=postgres \
  createuser -h /var/run/postgresql -p 5432 --login --createdb "$local_user"
sudo -u postgres env -i PATH="$PATH" HOME=/var/lib/postgresql PGREQUIREPEER=postgres \
  createdb -h /var/run/postgresql -p 5432 -O "$local_user" -T template0 meg_restore_drill
```

Se o papel ou banco já existir, **não recrie nem apague nada automaticamente**; inspecione o ambiente. `createuser` deve ser omitido se o papel local já existir. O restore recusa banco com schemas ou objetos adicionais além dos componentes nativos de um banco vazio.

```bash
export MEG_BACKUP_FILE='/seu/volume-seguro/MEG-Backups/ARQUIVO-REAL.pgdump.age'
export MEG_AGE_IDENTITY="$HOME/.meg-recovery-keys/identity.txt"
export MEG_RESTORE_ISOLATED_OK='YES'
# Não definir host, porta, senha, serviço ou túnel: o script fixa socket Unix e db.
bash scripts/meg-stage09-safe-restore-drill.sh
unset MEG_RESTORE_ISOLATED_OK
```

O script verifica SHA-256, autenticidade do socket local, identidade/versão do PostgreSQL e banco sem objetos; restaura somente `public` em uma transação e compara o número de tabelas com o manifesto. Variáveis libpq herdadas são isoladas com `env -i` e não podem redirecionar o restore. Além disso, exige presença de registros nas tabelas principais da aplicação. **Isso não homologa restauração de todo o Supabase**. Extensões e dependências de managed schemas podem impedir o restore local; esse erro deve ser registrado e tratado, **não ignorado com `--clean` ou `--disable-triggers`**.

## 4.1 Diagnostico financeiro sobre dados reais restaurados (12/11/2026)

- **Autoridade para testes:** `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` e os modulos canonicos `financial-policy.ts`, `amount-sign.ts`, `transfer-core.ts`, `opening-balance.ts`, `benefit-event-mutation.ts`, servicos de cartoes, pendentes e escrita de razao. As regras financeiras **nao foram reimplementadas**, tampouco uma consulta SQL passa a ser autoridade de saldo/fatura/pagamento.
- **Roteiro rastreavel na PR #666 Draft:** `scripts/meg-stage09-audit-financial-invariants.sh`, Git blob `1eec94cdc08c77c482bfcc057d8856568bf707e1`. Executa somente SELECT/CTEs em uma transacao `REPEATABLE READ READ ONLY` com `default_transaction_read_only=on`, `statement_timeout=30000`, `env -i`, `PGREQUIREPEER=postgres`, socket Unix `/var/run/postgresql/.s.PGSQL.5432`, cluster WSL `17/meg_restore` e usuario `m_vil`; somente base `meg_restore_drill`.
- Contagens diagnosticas: sinal e magnitude de eventos, precisao de centavos, competencia divergente de data, transferencias com `sourcePayload.transferId` e pernas conservativas, eventos de saldo inicial e vinculo de conta, Verocard/beneficios, debitos/creditos do razao, compras e parcelas de cartao, saldos em aberto e numeracao de pendentes, recibos de mutacao. **Nenhum valor monetario, identificador, nome, descricao, CPF, email, JSON ou linha e exibido.** Indicadores de legado ou diferencas de competencia nao devem ser automaticamente classificados como erros.
- **Artefato local ao usuario:** `MEG-ETAPA09-DIAGNOSTICO-FINANCEIRO-LOCAL-V5.ps1`; preserva o transporte Windows->WSL que passou na auditoria estrutural V4 (arquivo UTF-8 temporario, SHA-256 em ambos os lados, modo 0600, `bash -n`, marcador de EOF e limpeza). O Bash embutido deve corresponder exatamente ao Git blob acima; nenhuma credencial ou dado financeiro via GitHub/CI.
- **Teste de seguranca e SQL real com dados sinteticos:** CI `financial-invariants-postgres17` na workflow de Backup Safety usa contêiner PostgreSQL 17 descartavel, compara SQL em dados ficticios consistentes e apos insercao de inconsistencias artificiais. **Nao testa os dados reais nem executa a API financeira.** Verificar job e SHA do ultimo commit antes de anunciar resultado da CI.
- **Estado:** script preparado e versionado, **diagnostico dos dados reais nao executado neste chat**; aguardar relatorio do operador e tratar qualquer contagem nao nula como investigacao, sem mudar o banco. Uma leitura de invariantes nao homologa servicos de transferencia, pagamento, beneficio, parcelamento, saldo e relatorios: testes funcionais dos modulos canonicos e nova plataforma Supabase continuam pendentes.

### Resultado V5 no backup real restaurado, 12/11/2026

- **Execucao aprovada em ambiente local isolado e somente leitura**: `CODIGO_LINUX=0`, snapshot PostgreSQL 17 `meg_restore_drill` via Unix socket peer. 6.576 eventos totais, 3.731 ativos.
- **Pendencias de investigacao (nao erros comprovados)**: 38 despesas ativas com `signedAmount>0`, 140 eventos ativos com fracao subcentavo em `amount` ou `signedAmount`, 5 registros ativos com `competence` diferente do mes da data; nenhuma magnitude `abs(signedAmount)!=amount`; nenhuma receita negativa.
- **Amostra insuficiente:** 0 transferencias modernas ativas e 0 `Payable`, logo as contagens de inconsistencias iguais a zero nao exercitam as regras de transferência ou de pendentes; 0 eventos ativos de saldo inicial `opening-balance:` nao implica erro porque existe fallback de migracao. Beneficio: 315 eventos ativos na conta e 0 Verocard fora de conta beneficio; 23 parcelas de cartao com testes de consistencia basica sem achados; 219 registros de razao sem violacao dos tres testes simples; 254 recibos de mutacao.
- **Regra de seguranca:** nao alterar dados restaurados, nao recalcular saldo/fatura com SQL paralelo e nao confundir consulta de invariantes com execucao das regras financeiras canônicas. Usar primeiro triagem agregada por status, dominio beneficio, origem legada e tipo de operacao. Roteiro V6 local desta conversa, não commitado/não executado no WSL até relatório do usuário. Proximo gate exige analise dos resultados antes de qualquer mudanca de regra ou de dado.
- **Homologacao funcional continua pendente**, assim como Vault root key, schemas Supabase gerenciados, Render e Egress. Sem merge/deploy na PR #666.

### Resultado V6: triagem legada e limites da classificação (12/11/2026)

- **V6 executada em ambiente local isolado, somente leitura** (`CODIGO_LINUX=0`, `TRIAGEM_FINANCEIRA_LOCAL_EXECUTADA`), confirmando a fotografia V5. 38 despesas com `signedAmount` positivo, todas realizadas, estimadas monetarias e todas com ID legado; 0 associadas a conta beneficio, 2 com ledger. **Nao converter sinais automaticamente.**
- **Semantica do legado CONFIRMADA NO CODIGO:** `apps/api/src/modules/app-state/normalization-migration-core.ts` define expressamente que `amount` negativo de uma despesa representa estorno ou credito de despesa, preservando `signedAmount>0`. `normalization-migration-core.test.ts` cobre estorno com `expenseAmount` negativo e caso de `expenseAmount` absoluto + `amount` negativo. `amount-sign.test.ts` cobre despesa informada como valor negativo na API. **A legitimidade individual dos 38 eventos ainda nao foi conferida pela leitura de seus payloads no WSL**; contagem agregada de IDs legados apenas indica compatibilidade.
- 140 eventos com fracoes subcentavo: 125 realizados, 106 realizados monetarios estimados, 19 de beneficio estimado, 15 nao realizados; 138 com origem legada, 7 com ledger, 139 com mais de quatro casas. A normalizacao legada usa valores Number e preserva fracao ao preencher Decimal (sem round individual); algumas leituras financeiras arredondam agregados. **Nao existe evidencia ainda de divergencia em saldo calculado pelo modulo canonico**; manter bloqueio de homologacao funcional ate ensaios de precisao.
- 5 competencias divergentes: todas realizadas, sem ID legado, beneficio estimado ou metodo cartao de credito; `event-mutation.ts` tem campo opcional `competence` e grava `input.competence || input.date.slice(0,7)`. Assim divergencia pode ser intencional; **o teste V6 nao comprovou origem nem justificativa individual**. Nenhuma mudanca automatica de competencia.
- 0 eventos ativos de transferência e 0 Payable; dominios sem dados de exercicio, **nao homologados**. 0 saldos iniciais nao-zero e 0 eventos opening-balance: nenhum erro comprovado apenas por ausencias.
- **Próxima verificação sugerida:** testes de caracterização OFFLINE dos módulos canonicos com entradas sinteticas e analise dirigida dos casos de precisao (sem SQL que recalcule saldo como fonte de verdade). O banco real restaurado fica preservado. Qualquer investigacao de origem real deve ser em modo somente leitura e sem exibir dados pessoais, nomes, valores ou segredos.
- Etapa 09 **nao concluida**: Vault root key, Auth/Storage e outras configuracoes gerenciadas, regras financeiras funcionais, backup recorrente/retenção, Render e Egress permanecem pendentes; PR #666 Draft e NO-GO.

### Resultado V8: origem historica e precisao subcentavo (12/11/2026)

- **V8 executada de verdade no PostgreSQL restaurado:** 12/11/2026 06h59min28s, `CODIGO_LINUX=0`, `RESULTADO=CONFERENCIA_ORIGEM_PRECISAO_EXECUTADA`, `DB=meg_restore_drill`, `ROLE=m_vil`, `READ_ONLY=on`, `TCP_EFETIVO=DESABILITADO`, `SOCKET_LOCAL=VALIDADO`. Cluster `17/meg_restore` estava `down`, foi iniciado controladamente (`PARTIDA_LOCAL=CODIGO_0`) e ficou `online` na **mesma sessão** da consulta; arquivos temporarios removidos, hashes verificados, nenhum dado financeiro modificado (startup PostgreSQL pode escrever arquivos operacionais). Sem acesso de producao, `pg_dump`, restore, Vault, merge ou deploy.
- **Estornos legados:** 38 despesas positivas, todas de origem legada e todas com `sourcePayload.amount` negativo, zero casos sem origem/sinal identificavel. Este e um **contrato explicitamente previsto** no `normalization-migration-core.ts` e caracterizado em testes; **nao reverter sinais**. Nao houve validacao individual de legitimidade das 38 operacoes, apenas evidencia coletiva de aderencia ao formato.
- **Subcentavo:** 140 eventos, 138 legados e 2 nao legados; 106 realizados monetarios *estimados*; 139 residuos de ate 0,000001 e 1 residuo entre 0,000001 e 0,001; nenhum acima de 0,001. A origem de 2 nao legados nao foi determinada e a API financeira **nao foi executada**. A relevancia no saldo calculado pelas autoridades canonicas depende de testes funcionais, **nao tratar pequena fracao como comprovacao de arredondamento seguro**; proibido ajustar valores armazenados automaticamente.
- **Competencias diferentes da data:** 5, todas nao legadas e com formato valido, 4 receitas e 1 despesa. A API admite `competence` explicita diferente do mes de `date`; sem evidencias da intencao individual nao alterar competencias.
- **Gates:** consulta diagnostica concluida e os achados V5/V6/V8 explicados em nivel agregado. Auditorias funcionais da API, efetiva precisao monetaria, estornos individuais, transferencias, beneficios, faturas, pagamentos, restauração Supabase gerenciada e Vault continuam nao homologados. Proximo teste preferencial: caracterizacao offline dos modulos financeiros com dados **sinteticos**, sem writer contra banco restaurado; evitar novos ciclos repetidos de varreduras reais.

### Caracterização funcional OFFLINE pós-V8, dados integralmente sintéticos (12/11/2026)

- **Motivação:** V4 validou estrutura `public`; V5/V6/V8 diagnosticararam dados reais por contagem, mas não exercitaram funções financeiras canônicas. Não repetir a varredura nem alterar o banco restaurado.
- **Novo teste de execução de funções puras na branch isolada da PR #666:** `apps/api/src/modules/finance/stage09-restored-financial-characterization.test.ts`, incluído ao final de `apps/api/package.json` > `scripts.test:finance`. Com isso, o workflow geral `MEG Platform CI` executa o teste dentro de `npm run check`. Não houve alteração de writers, API de produção, Web ou Android. O script não importa Prisma e não possui conexão a banco; imports diretos das autoridades canônicas existentes.
- **Casos fictícios:** estorno de despesa legado (`amount` negativo de origem, `signedAmount` positivo) e roundtrip de `sourcePayload`; preservação de frações subcentavo no evento legado; arredondamento de *sumário agregado* e demonstração da diferença para arredondamento por item; exclusão de benefício/Verocard do saldo monetário; status receita/Fixo e cartão; competência explícita em schema + writer e fatura de cartão; crédito e saldo credor sem valor negativo pagável; parcela aberta/parcial; transferência conservativa e bloqueios de conta igual ou valor que arredonda a zero; centavos de baixa e calendário. **Não usa identificadores, valores, segredos ou dados do usuário.**
- **Limites obrigatórios:** os testes de funções puras não validam precisão do PostgreSQL/Prisma, entradas reais individualizadas, concorrência, atomicidade, saldo real, writers, RLS nem recuperação integral Supabase. A segurança financeira exige futuros testes integrados em PostgreSQL descartável, depois da aprovação desta etapa offline. Logs de CI não devem ser interpretados como homologação de produção.
- **Situação do gate:** teste versionado; verificar `MEG Platform CI` e `test:finance` no HEAD da PR antes de marcar aprovado. Sem merge, deploy, alteração no banco restaurado, Supabase, Vault ou Render.

#### Resultado verificado da caracterização OFFLINE (CI)

- Teste adicional **executado de verdade** na branch da PR #666, commit `22c67b78c4495b3deb598215dafc2cc509bc9601`. Logs de `MEG Platform CI` comprovam `Stage09 OFFLINE canonical financial characterization: PASS (synthetic only)`, testes `test:finance` concluídos e `build:web` + `build:api` finalizados com **SUCCESS**: [run #43197995593](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43197995593).
- `MEG Stage09 Backup Recovery Safety (offline)` [run #43197995738](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43197995738) **SUCCESS**. Gate de CORS pontual [run #43197996019](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43197996019) **SUCCESS**. A workflow `MEG Web Evolution Foundation` foi `skipped` neste commit, não classificar como `success` de uma validação visual.
- **Falha anterior de teste corrigida somente no arquivo de testes:** quando o evento de cartão estava `paid`, o histórico incluía o crédito, mas `creditBalance` aberto era 0; o primeiro teste exigia incorretamente 62 em aberto. A correção separou um cenário `paid` (histórico) de outro `planned` (fatura aberta), sem modificar `card-statement-canonical.ts` ou qualquer regra de negócio. Versão corrigida comprovada na CI acima.
- **Gate aprovado:** caracterização de funções puras das regras canônicas com dados sintéticos, sem consultas a registros reais. **Gates não cobertos:** lógica de writer com transações, idempotência, saldo efetivo em Prisma/PostgreSQL, concorrência, segurança/RLS, recuperação integral Supabase, Vault root key e Render. A aprovação dos testes não autoriza merge/deploy; PR permanece DRAFT.

### Gate integrado PostgreSQL 17 descartavel com writers financeiros canônicos (12/11/2026)

- **Teste real contra PostgreSQL 17 DESCARTAVEL:** workflow novo `.github/workflows/meg-stage09-financial-integrity.yml`, na branch Draft da PR #666. O serviço PostgreSQL `postgres:17` é efêmero e gerado no próprio GitHub Actions, com `DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/meg_stage09_synthetic?schema=public` (credenciais FICTICIAS; URL completa usada apenas em contexto do teste, sem Supabase), `MEG_STAGE09_SYNTHETIC_ONLY=YES`, `NODE_ENV=test`, sem segredos GitHub nem acesso a produção. O runner confere explicitamente o alvo local antes de `npm ci`, `db:generate` e `db:push`. A criação de esquema é exclusiva do banco vazio e descartável do job; **não utiliza** o WSL/restauração `meg_restore_drill` do operador.
- **Teste existente reutilizado** `apps/api/src/modules/finance/rc1-financial-e2e.test.ts`: receita/despesa postadas e planejadas, razão, saldo, transferência de duas pernas, idempotência por recibo, benefícios protegidos e bloqueio por saldo insuficiente, proteção de conta estrangeira, atualização, arquivamento, auditoria. Parte das operações iniciais do fixture usa compatibilidade histórica `service.ts`, não confundir com writer Phoenix protegido; nova caracterização abaixo aborda o writer oficial.
- **Novo E2E do writer protegido** `apps/api/src/modules/finance/stage09-protected-write-e2e.test.ts`: `createFinancialEventProtected`, `createFinancialTransfer` em contexto de workspace/account sintético, recibo idempotente e replay, rejeição de mesmo operationId com corpo diferente, ausência de evento/razão/recibo na tentativa inválida, estorno de despesa com `signedAmount` positivo, competência customizada, compra em crédito planejada sem razão e conta de benefício bloqueada no writer monetário. Uma transferência de saldo insuficiente deve não produzir nenhum registro, recibo ou ação de auditoria. Concorrência: duas transferências independentes no mesmo instante, cada uma exigindo 125 de uma origem com 175 disponíveis; exatamente **uma pode vencer**, a outra deve falhar, com só duas pernas novas, um recibo e uma auditoria. Resultados aferidos em dados fictícios.
- **Evidência de execução verde com concorrência:** `STAGE09_TARGET=LOCAL_EPHEMERAL_PG17_ONLY`, `RC1 financial E2E: APROVADO.`, `STAGE09_PG17_PROTECTED_WRITERS=PASS_SYNTHETIC_ONLY`, `STAGE09_SCOPE=EVENT_WRITER_TRANSFER_IDEMPOTENCY_ATOMICITY_CONCURRENT_BALANCE_REFUND_COMPETENCE_CREDIT_BENEFIT_ROUTING`. Workflow dedicado [run #43200214257](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43200214257), **SUCCESS**, commit `459e939d5976e84268e4311e0062856e6459849c`. O teste também havia passado sem concorrência no run #43199542989; último inclui o desafio de saldo sob concorrência.
- **Falha intermediária corrigida APENAS no teste:** a primeira versão executou corretamente em `tsx` com PostgreSQL 17, mas o `tsc` da CI rejeitou acessos a retornos tipados `unknown` e à união de resposta de replay. Foram adicionadas funções explícitas de assert/narrowing no teste, sem conversão forçada nem alteração em `event-mutation.ts`, `transfer-service.ts` ou outra regra financeira. `MEG API Etapa 09 - testes pontuais CORS` no commit corrigido `459e939` concluiu **SUCCESS**; Backup Safety também **SUCCESS**. Confirmar MEG Platform CI do mesmo commit ao fechar a entrega.
- **Gate aprovado com limite:** execução integrada dos **writers de evento, transferência e benefício** em base local sintética; serialização, idempotência, razão e tentativas sem saldo testados nos cenários descritos. **Nao foram testados neste job** workflows reais de pagamento de `Payable`, writer de fatura/cartão, todas as corridas de concorrência, recuperação real do sistema, dados financeiros de usuários, autenticação/RLS, Vault root key, Auth/Storage/config Supabase, segredos Render e Egress. Nenhum destes gates é dispensado pelo verde da CI. PR #666 segue Draft, sem merge/deploy.

### Extensão do gate integrado: writers de pendentes e faturas (12/11/2026)

- **Escopo executado:** novo teste `apps/api/src/modules/finance/stage09-card-payable-e2e.test.ts` integrado em `.github/workflows/meg-stage09-financial-integrity.yml`, exclusivamente em PostgreSQL 17 `meg_stage09_synthetic` descartável, credenciais fictícias, guardas estritas de CI/host/banco, sem conexão ao banco restaurado ou produção.
- **Pendentes / Payable:** `createPayablesProtected` com R$ 100,01 fictícios divididos em três parcelas (33,34/33,34/33,33), calendário com fim de semana; idempotência de criação, bloqueio de operação reutilizada com corpo diferente; `payPayableProtected` com baixa parcial de principal e juros/multa separados, baixa final, status e saldo aberto, recibo, evento financeiro e auditoria; recusas por insuficiência e por pagamento acima do saldo sem efeitos parciais.
- **Cartões / faturas:** `createCardPurchaseProtected` criando parcelas e competências canônicas, replay sem nova compra; `payCardStatementProtected` parcial e total com atualização de parcelas, financeiro, razão, recibos, idempotência, bloqueios por método de crédito, excesso de valor e falta de saldo. Os meses seguintes permanecem sem baixa.
- **Resultado de CI do código testado:** [Financial Integration PG17 #43203221490](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221490) **SUCCESS** (`STAGE09_PG17_CARD_PAYABLE_WRITERS=PASS_SYNTHETIC_ONLY`); [MEG Platform CI #43203221409](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221409) **SUCCESS**; [Backup Safety #43203221413](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221413) **SUCCESS**; [CORS #43203221394](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43203221394) **SUCCESS**. Esses resultados não atestam produção, recuperação de schemas Supabase gerenciados ou correção de todas as invariantes financeiras.
- **DIVERGÊNCIA CONFIRMADA NO FIXTURE SINTÉTICO, NÃO RESOLVIDA:** as duas baixas com `payPayableProtected` produziram `PayablePayment` e `FinancialEvent` realizados, mas **zero** entradas de `LedgerEntry` para os eventos (`STAGE09_PAYABLE_LEDGER_ROWS_OBSERVED=0`). O writer de fatura no mesmo teste produziu duas entradas de razão. O código atual de `payPayableProtected` não insere `LedgerEntry`. Issue de investigação [#674](https://github.com/MarcosVilalva/MEG-Platform/issues/674) aberta para confrontar autoridade financeira e compatibilidade histórica. **Não declarar essa parte do gate homologada; não corrigir sem análise de negócio.** A ausência de razão pode afetar a completude contábil de eventos realizados, apesar de as consultas de saldo utilizarem `FinancialEvent`.
- **Limites persistentes:** nenhum teste com dados reais, nenhuma alteração no WSL restaurado, produção, Supabase, Vault, Render, Android, UI Web. A CI verde significa que os cenários automáticos passaram, **não** que a divergência #674 esteja resolvida. Pendem também casos de concorrência de pendentes/cartões, RLS, recuperação Vault/Auth/Storage/config, Egress e rotina de backup/retention.

## 5. Vault e material secreto: gate separado e crítico

A consulta agregada revelou **1 entrada em `vault.secrets`**. Pela documentação Supabase, a chave-raiz do projeto **não integra dumps**. Uma restauração lógica em novo projeto pode deixar segredos e colunas criptografadas ilegíveis sem a chave original.

Procedimento para terminal/gerenciador **privado**, por responsável que controla a organização (o arquivo abaixo está preparado; a consulta real ainda NÃO foi executada):

1. Enquanto o **projeto original permanece ativo**, obter a chave-raiz do projeto via método oficial do Supabase (Management API `/v1/projects/<project_ref>/pgsodium` com token de acesso pessoal). **Não recuperar a chave nesta conversa**, não registrar em logs do Work e não enviá-la ao GitHub.
2. O script abaixo faz essa consulta de leitura, interpreta o JSON documentado com campo **`root_key`** de 64 caracteres hexadecimais e salva o resultado diretamente criptografado, sem exibir o conteúdo. Exige **token pessoal inserido localmente**, nunca neste chat:

```bash
read -r -s -p 'Token Supabase pessoal, somente no terminal privado: ' SUPABASE_ACCESS_TOKEN; echo
export SUPABASE_ACCESS_TOKEN
export MEG_VAULT_KEY_BACKUP_DIR='/outro/volume-seguro/MEG-Vault-Key' # diferente do backup do banco
export MEG_AGE_RECIPIENT="$(age-keygen -y "$MEG_AGE_IDENTITY")"
bash scripts/meg-stage09-safe-vault-rootkey.sh
unset SUPABASE_ACCESS_TOKEN
```

Armazenar a chave-raiz criptografada, com restrição de acesso, **separadamente** do dump e de sua própria chave de descriptografia. Registrar no manifesto operacional apenas o status **"chave guardada e acesso testado"**, nunca o valor.
3. Para validar recuperação integral, criar **outro projeto Supabase isolado**, sujeito a avaliação prévia do custo e autorização de operações. Restaurar dados com o fluxo oficial, configurar extensões/permissões, copiar chave-raiz conforme procedimento da documentação e verificar uso do Vault sem expor o segredo. **Não enviar PUT da chave-raiz para o projeto original**, sob hipótese alguma.
4. Documentar backups de credenciais externas, JWT secrets, configurações do Render, integrações e eventualmente Storage, todos fora do GitHub.

Documentação: [Supabase Backups](https://supabase.com/docs/guides/platform/backups), [Backup/Restore CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Supabase CLI v3](https://supabase.com/changelog/supabase-cli-v3).

## 6. Gates de segurança, monitoramento e continuidade

- [x] Projeto identificado, 32 tabelas públicas e presença de Vault inventariadas com consultas **agregadas de leitura**.
- [x] Código de exportação encriptada e teste local guardado em branch isolada, sem credenciais.
- [x] Testes **simulados** de segurança do script, bloqueio de restore remoto e conferência de integridade de arquivo. Um job de PostgreSQL 17 **sintético** foi definido na CI para executar o **script real de restore via socket Unix**; seu resultado deve ser conferido no SHA final da PR. Não se confundem com backup/recovery efetivo.
- [x] Exportação **real** do PostgreSQL executada: 11/11/2026, arquivo age validado integralmente e SHA-256 conferido.
- [x] Arquivo criptografado e manifesto copiados ao OneDrive pessoal com hash conferido; download separado conferido por hash, com origem Web declarada pelo operador e não atestável pelo script offline.
- [ ] Chave de recuperação `age` armazenada offline e leitura testada.
- [ ] Chave-raiz Supabase Vault protegida sem divulgação por meio de exportação criptografada e confirmação privada.
- [x] **Restore real de `public`** no PostgreSQL 17 local WSL, em `meg_restore_drill`, concluído com código 0: 32/32 tabelas e registros nas três tabelas essenciais.
- [x] **Auditoria estrutural independente de `public` em somente leitura, V4**: 32 tabelas, 32 PK, 52 FK, 0 constraints não validadas e 0 índices inválidos/não prontos; `User`=2, `AppState`=1 e `FinancialEvent`=6.576, PostgreSQL 17 via socket Unix local; script SHA/sintaxe conferidos e código final 0 (12/11/2026 03h25).
- [ ] Auditorias complementares de integridade referencial dos dados, RLS/permissões, comparações completas de contagens com a origem e testes funcionais das regras financeiras canônicas; não inferir aprovação a partir da auditoria de catálogo.
- [ ] Recuperação de componentes Supabase gerenciados e configurações externas em **novo projeto isolado**, se necessária à homologação integral.
- [ ] Política de frequência (sugestão: backup diário), retenção e alerta de falha aprovada; automação somente **após** restore validado. Backup diário implica perda potencial de até um dia de alterações, sem PITR.
- [ ] Build Command Render seguro e recuperação das cotas liberados antes do deploy das PRs #665/#663, mantendo #656 e Home PT2 em seus escopos.

**Estado atualizado em 12/11/2026:** o MEG continua na **Etapa 09**, com **backup real criptografado, restauração do schema `public` e auditoria estrutural independente comprovados** em WSL isolado, mas sem recuperação integral do Supabase ou homologação funcional financeira. O kit não alterou produção, API, Android, frontend, regras financeiras ou Render, e não configura backup automático. PR #666 Draft, sem merge; NO-GO de deploy até concluir os demais gates.
