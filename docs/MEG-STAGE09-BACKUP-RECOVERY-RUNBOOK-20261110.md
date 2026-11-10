# MEG Web Evolution | Etapa 09 | Backup e recuperação, plano executável

**Preparado em 10/11/2026. Status: CANDIDATO.** Procedimentos e testes com ferramentas simuladas não substituem dump efetivo e recuperação real. Nenhuma senha, chave privada ou dado de usuário deve ser anexado ao GitHub, ChatGPT, issues, logs ou capturas.

## 1. Escopo verificado na produção (somente leitura)

- Organização Supabase: `MEG Vilalva` (`gkvlezwigvinfcbsemjx`), projeto `meg-financas` (`ugbiqzaqnrhulhetevby`), PostgreSQL **17**, região `sa-east-1`, plano **Free**. O painel Usage acusou restrição por Egress no ciclo iniciado em 27/10/2026. O metadado `ACTIVE_HEALTHY` da API Management não prova que requisições da aplicação estejam disponíveis.
- **32 tabelas em `public`** (aprox. 18 MB ocupados), **2 registros em `public."User"`**: a autenticação do MEG fica no seu próprio domínio, não no Supabase Auth. Há **27 tabelas internas no schema `auth`, mas zero registros em `auth.users`**. Há **0 buckets e 0 objetos** em Supabase Storage no momento da consulta.
- **1 registro no `vault.secrets`**, **7 extensões** instaladas. Não foram consultados nem extraídos conteúdo de registros, hashes de senhas, segredos ou valores financeiros.
- O Supabase **Free não possui backups automáticos gerenciados**. Antes desta etapa, nenhum backup externo/restauração isolada estava comprovado. O GitHub não contém workflow específico de backup.
- O Build Command do Render `meg-platform-api` ainda contém etapas capazes de modificar o banco (`db:prepare:production` e `db:push:production` com `--accept-data-loss`). **Não executar merge/deploy até sanar o risco.**

## 2. O que este kit protege e o que ele NÃO promete

Arquivos nesta PR:

1. `scripts/meg-stage09-safe-backup.sh`: exportação **lógica completa do PostgreSQL com `pg_dump`**, formato custom, enviada diretamente ao **age** por pipe. Nenhum dump SQL aberto é escrito no disco. Um manifesto com SHA-256 do arquivo criptografado e inventário é gerado. Inclui esquemas gerenciados **somente na medida em que o usuário PostgreSQL tiver leitura e o `pg_dump` os incluir**. Dump de schemas internos **não é** automaticamente restaurável em outro Supabase.
2. `scripts/meg-stage09-safe-restore-drill.sh`: valida SHA-256 e descriptografa em fluxo, restaurando **apenas o schema `public`** em banco PostgreSQL **exclusivamente local** (`127.0.0.1:5432/meg_restore_drill`). O script recusa banco não vazio e recusa host remoto ou nome de banco diferente. Compara 32 tabelas (ou o número encontrado durante a exportação) e exige registros presentes em `User`, `AppState` e `FinancialEvent`.
3. `scripts/meg-stage09-backup-safety.test.mjs`: testa o controle de fluxo e bloqueios com **ferramentas simuladas e dados fictícios**, nunca com produção. A workflow também executa um ensaio de **PostgreSQL 17 real, mas com dados inteiramente sintéticos e bancos descartáveis**, verificando `pg_dump` → `age` → `pg_restore`. **Nenhum desses testes comprova restauração dos dados verdadeiros do MEG.**

**Cobertura ainda pendente após rodar o kit:** chave-raiz de criptografia do Supabase Vault; senhas dos papéis customizados; segredos de ambiente do Render, chaves de autenticação da API, variáveis operacionais e credenciais externas; objetos Storage futuros; settings, extensões e ajustes de schemas gerenciados; restauração realmente funcional em um **novo projeto Supabase isolado**. Não confundir um dump existente com um plano integral de recuperação.

## 3. Pré-requisitos no PC ou runner privado

- Bash com `pipefail` (Linux, WSL ou Git Bash), Git, utilitários GNU (incluindo `sha256sum`). **Nunca** executar no GitHub Actions com logs/artefatos reais de produção.
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

Copiar os valores **somente do painel Connect do projeto `meg-financas`**. Para conexão direta, o usuário é `postgres`; para Session Pooler é `postgres.ugbiqzaqnrhulhetevby`. O script exige host desse projeto e TLS:

```bash
export PGHOST='db.ugbiqzaqnrhulhetevby.supabase.co' # ou o host Session Pooler exibido no painel
export PGUSER='postgres'                            # ou postgres.ugbiqzaqnrhulhetevby, para Pooler
export PGPORT='5432'
export PGDATABASE='postgres'
export PGSSLMODE='require'
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

## 4. Ensaio isolado de restauração do domínio financeiro

Em **PostgreSQL 17 local**, com um servidor que NÃO aponte para Supabase, criar manualmente um banco de teste **novo e vazio** chamado exatamente `meg_restore_drill`, de preferência a partir do `template0`:

```bash
createdb -h 127.0.0.1 -p 5432 -U postgres -T template0 meg_restore_drill
```

Confirmar antes: essa instrução **escreve apenas no servidor LOCAL**. Nunca executar se a conexão foi redirecionada por túnel ou proxy para produção. O script abaixo recusa destinos remotos e bancos que já contenham tabelas `public`.

```bash
export MEG_BACKUP_FILE='/seu/volume-seguro/MEG-Backups/ARQUIVO-REAL.pgdump.age'
export MEG_AGE_IDENTITY="$HOME/.meg-recovery-keys/identity.txt"
export MEG_RESTORE_HOST='127.0.0.1'
export MEG_RESTORE_PORT='5432'
export MEG_RESTORE_DB='meg_restore_drill'
export MEG_RESTORE_USER='postgres'
read -r -s -p 'Senha PostgreSQL LOCAL: ' MEG_RESTORE_PASSWORD; echo
export MEG_RESTORE_PASSWORD
export MEG_RESTORE_ISOLATED_OK='YES'

bash scripts/meg-stage09-safe-restore-drill.sh
unset MEG_RESTORE_PASSWORD MEG_RESTORE_ISOLATED_OK
```

O script exige o SHA-256, restaura apenas objetos `public` em uma transação e compara o número total de tabelas com o manifesto. Além disso, exige presença de registros nas tabelas principais da aplicação. **Isso não homologa restauração de todo o Supabase**. Extensões e dependências de managed schemas podem impedir o restore local; esse erro deve ser registrado e tratado, **não ignorado com `--clean` ou `--disable-triggers`**.

## 5. Vault e material secreto: gate separado e crítico

A consulta agregada revelou **1 entrada em `vault.secrets`**. Pela documentação Supabase, a chave-raiz do projeto **não integra dumps**. Uma restauração lógica em novo projeto pode deixar segredos e colunas criptografadas ilegíveis sem a chave original.

Procedimento autorizado a ser feito apenas em terminal/gerenciador **privado**, por responsável que controla a organização:

1. Enquanto o **projeto original permanece ativo**, obter a chave-raiz do projeto via método oficial do Supabase (Management API `/v1/projects/<project_ref>/pgsodium` com token de acesso pessoal). **Não recuperar a chave nesta conversa**, não registrar em logs do Work e não enviá-la ao GitHub.
2. Armazenar a chave-raiz criptografada, com restrição de acesso, **separadamente** do dump e de sua própria chave de descriptografia. Registrar no manifesto operacional apenas o status **"chave guardada e acesso testado"**, nunca o valor.
3. Para validar recuperação integral, criar **outro projeto Supabase isolado**, sujeito a avaliação prévia do custo e autorização de operações. Restaurar dados com o fluxo oficial, configurar extensões/permissões, copiar chave-raiz conforme procedimento da documentação e verificar uso do Vault sem expor o segredo. **Não enviar PUT da chave-raiz para o projeto original**, sob hipótese alguma.
4. Documentar backups de credenciais externas, JWT secrets, configurações do Render, integrações e eventualmente Storage, todos fora do GitHub.

Documentação: [Supabase Backups](https://supabase.com/docs/guides/platform/backups), [Backup/Restore CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Supabase CLI v3](https://supabase.com/changelog/supabase-cli-v3).

## 6. Gates de segurança, monitoramento e continuidade

- [x] Projeto identificado, 32 tabelas públicas e presença de Vault inventariadas com consultas **agregadas de leitura**.
- [x] Código de exportação encriptada e teste local guardado em branch isolada, sem credenciais.
- [x] Testes **simulados** de segurança do script, bloqueio de restore remoto e conferência de integridade de arquivo. Um job de PostgreSQL 17 **sintético** foi definido na CI para verificar a cadeia criptografada; seu resultado deve ser conferido na própria execução. Não se confundem com backup/recovery efetivo.
- [ ] Exportação **real** do PostgreSQL executada com resultado confirmado.
- [ ] Arquivo criptografado copiado e verificado em repositório de armazenamento **externo** ao Supabase/GitHub.
- [ ] Chave de recuperação `age` armazenada offline e leitura testada.
- [ ] Chave-raiz Supabase Vault protegida sem divulgação.
- [ ] Teste com **PostgreSQL real local**, verificação de contagens, dados essenciais, RLS/permissões e dependências.
- [ ] Recuperação de componentes Supabase gerenciados e configurações externas em **novo projeto isolado**, se necessária à homologação integral.
- [ ] Política de frequência (sugestão: backup diário), retenção e alerta de falha aprovada; automação somente **após** restore validado. Backup diário implica perda potencial de até um dia de alterações, sem PITR.
- [ ] Build Command Render seguro e recuperação das cotas liberados antes do deploy das PRs #665/#663, mantendo #656 e Home PT2 em seus escopos.

**Estado:** o MEG continua na **Etapa 09 — Lançamentos**. Este kit não altera API, Android, Frontend, regras financeiras, Render ou o Supabase; não foi publicado, nem configura backup automático por si só. O projeto só deixa de estar sem backup recuperável **depois de realizar a exportação e provar a restauração**.
