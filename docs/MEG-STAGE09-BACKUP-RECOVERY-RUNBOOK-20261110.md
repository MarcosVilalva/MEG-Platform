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
- [ ] Exportação **real** do PostgreSQL executada com resultado confirmado.
- [ ] Arquivo criptografado copiado e verificado em repositório de armazenamento **externo** ao Supabase/GitHub.
- [ ] Chave de recuperação `age` armazenada offline e leitura testada.
- [ ] Chave-raiz Supabase Vault protegida sem divulgação por meio de exportação criptografada e confirmação privada.
- [ ] Teste com **PostgreSQL real local**, verificação de contagens, dados essenciais, RLS/permissões e dependências.
- [ ] Recuperação de componentes Supabase gerenciados e configurações externas em **novo projeto isolado**, se necessária à homologação integral.
- [ ] Política de frequência (sugestão: backup diário), retenção e alerta de falha aprovada; automação somente **após** restore validado. Backup diário implica perda potencial de até um dia de alterações, sem PITR.
- [ ] Build Command Render seguro e recuperação das cotas liberados antes do deploy das PRs #665/#663, mantendo #656 e Home PT2 em seus escopos.

**Estado:** o MEG continua na **Etapa 09 — Lançamentos**. Este kit não altera API, Android, Frontend, regras financeiras, Render ou o Supabase; não foi publicado, nem configura backup automático por si só. O projeto só deixa de estar sem backup recuperável **depois de realizar a exportação e provar a restauração**.
