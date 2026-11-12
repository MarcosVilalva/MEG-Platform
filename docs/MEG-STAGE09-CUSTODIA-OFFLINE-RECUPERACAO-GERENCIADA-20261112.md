# MEG Finanças Web Evolution | Etapa 09
## Custódia offline e recuperação do Supabase gerenciado | plano de 12/11/2026

**Estado: PLANEJADO / NO-GO PARA RECUPERAÇÃO INTEGRAL.** Documento de governança e procedimento; não constitui atestado de custódia física, teste de recuperação do Vault nem autorização para novas conexões ao projeto produtivo. Escopo: PR #666, branch `stage09/backup-recovery-kit-20261110`. Preservar banco WSL restaurado, produção, Android, Home/Web homologada, Render e testes financeiros.

### 1. Linha de base confirmada pelo checkpoint e runbook

- Backup real PostgreSQL 17 criptografado com `age`, arquivo e manifesto com hash conferido; cópia externa declarada como obtida do OneDrive Web e verificada por download/hash. A origem Web é atestada pelo operador, não por telemetria independente.
- Restauração real de **`public` somente** concluída no banco local `meg_restore_drill`, 32/32 tabelas; V4 estrutural e V5/V6/V8 de diagnóstico executadas com limites documentados. Não significa restauração integral do Supabase ou homologação funcional financeira.
- Identidade privada `age` existente no WSL conforme preparações anteriores; o registro de cópia cifrada e de OneDrive NÃO comprova mídia fisicamente offline ou disponibilidade independente do notebook/nuvem.
- Supabase gerenciado `meg-financas`: plano Free, 1 registro `vault.secrets`; zero registros `auth.users`, zero buckets/objetos Storage nas consultas históricas; extensão `pg_net` em `public` e função watchdog sob investigação #676.
- Issue #674: fix de `LedgerEntry` para baixas na branch Draft, testado somente em PostgreSQL 17 sintético; não integrar nem alterar registros históricos.
- Nenhuma chave-raiz Vault real foi obtida ou testada neste trabalho. O script `scripts/meg-stage09-safe-vault-rootkey.sh` está preparado, mas NÃO deve ser executado sem autorização específica.

### 2. Evidências de custódia: não confundir controles

| Controle | Estado em 12/11 | Evidência exigida para encerrar |
| --- | --- | --- |
| `age` local em WSL | Preparação anterior registrada; não revalidada nesta rodada | Arquivo existe, permissões privadas e chave pública derivável, com saída apenas OK/ERRO |
| Backup `.pgdump.age` offsite | Download/hash registrado | Manter hash e manifesto sem divulgar bytes; rechecagens em intervalos definidos |
| Cópia da identidade `age` em OneDrive | Há histórico de cópia criptografada; não tomar como offline | Distinguir cifragem, acesso e dependência da conta; não registrar passphrase |
| **Identidade `age` em mídia física offline** | **NÃO VERIFICADA** | Mídia fisicamente independente, cifrada, acesso do responsável, desafio sintético de descriptografia, desconexão e registro sem segredos |
| Cópia de recuperação da passphrase da mídia, se aplicável | **NÃO VERIFICADA** | Meio independente da mídia, acesso autorizado e teste de recuperação; sem valores no relatório |
| Chave-raiz Supabase Vault | **NÃO EXPORTADA/VERIFICADA** | GET oficial separado, somente com aprovação; arquivo criptografado, hash e teste privado de abertura, custódia separada do banco e da identidade age |
| Recuperação Supabase gerenciado | **NÃO TESTADA** | Projeto isolado aprovado, inventário de config, restore e testes funcionais com critérios de aceite |

**Não marcar como verde pelo simples fato de existir arquivo, print, cópia em nuvem ou CI.** OneDrive exige conectividade e conta ativa; não constitui armazenamento fisicamente desconectado.

### 3. Verificação segura em estação privada, sem tocar banco ou Supabase

Esta etapa depende da presença do operador e da mídia física. **Nenhuma execução remota é possível por este documento.** O operador deve conectar temporariamente a mídia sob controle próprio, desbloqueá-la em terminal privado e escolher a cópia da identidade que possa ser lida por `age-keygen -y`. Não usar execução com `set -x`, compartilhamento de tela, histórico contendo senha, Work, logs de CI ou pastas do repositório.

Comandos para **Bash no WSL**, exclusivamente locais, com cópia da identidade privada dentro de um volume físico já criptografado/desbloqueado. O comando só exibe indicadores e não mostra identidade nem chave pública. Ajustar o caminho digitado no prompt para a mídia REAL:

~~~bash
set +x
set -euo pipefail
LOCAL_ID="$HOME/.meg-recovery-keys/identity.txt"
if ! test -s "$LOCAL_ID"; then echo "AGE_LOCAL=NAO_ENCONTRADA"; exit 1; fi
read -r -p "Caminho absoluto da identidade na mídia física offline já desbloqueada: " OFFLINE_ID
if ! test -s "$OFFLINE_ID"; then echo "AGE_OFFLINE=NAO_ENCONTRADA"; exit 1; fi

# Deriva somente as chaves públicas em memória, sem exibir a identidade.
local_pub="$(age-keygen -y "$LOCAL_ID" 2>/dev/null)" || { echo "AGE_LOCAL=INVALIDA"; exit 1; }
offline_pub="$(age-keygen -y "$OFFLINE_ID" 2>/dev/null)" || { echo "AGE_OFFLINE=INVALIDA"; exit 1; }
if test "$local_pub" != "$offline_pub"; then echo "CHAVES_PUBLICAS=DIVERGENTES"; exit 1; fi

# Prova criptográfica de recuperação sobre texto FICTÍCIO, nunca sobre backup real.
canary="$(mktemp)"
trap 'rm -f -- "$canary"; unset local_pub offline_pub' EXIT
printf '%s' 'MEG-ETAPA09-CANARY-SINTETICO' | age -r "$local_pub" -o "$canary"
recovered="$(age -d -i "$OFFLINE_ID" "$canary")" || { echo "CANARY=FALHA"; exit 1; }
if test "$recovered" != 'MEG-ETAPA09-CANARY-SINTETICO'; then echo "CANARY=DIVERGENTE"; exit 1; fi
unset recovered
echo "AGE_COPIA_OFFLINE=CHAVE_CORRESPONDENTE"
echo "CANARY=DESCRIPTOGRAFIA_SINTETICA_OK"
echo "CUSTODIA_FISICA=EXIGE_ATESTADO_DO_OPERADOR"
~~~

**Condição importante:** esta rotina pressupõe que a identidade `age` está legível dentro de um volume **criptografado** já desbloqueado. Se a cópia offline for um arquivo cifrado por senha (`.age`, arquivo de gerenciador etc.), ela NÃO deve ser apontada diretamente como `OFFLINE_ID`; desenvolver antes uma rotina privada específica para esse formato, que não deixe plaintext persistente. Não usar cópia sem proteção em pendrive comum.

Após a prova, o operador confirma fora do terminal: (a) que a mídia é **física e independente do SSD/OneDrive**; (b) que existe um segundo caminho de desbloqueio com passphrase em custódia separada; (c) que a mídia foi ejetada/desconectada; (d) responsável e data de conferência. Registrar só `PRESENTE/TESTADO/SEPARADO/DESCONECTADO`, sem caminho sensível, chave, segredo, foto, senha ou identificadores de mídia. Os comandos acima não provam essas quatro condições físicas por conta própria.

### 4. Vault: caminho de salvaguarda e teste, sem execução neste gate

1. **Autorização separada antes de qualquer GET real** do projeto original. Confirmar que o projeto permanece ativo e que o operador tem permissão adequada. Preferir token pessoal com escopo e prazo mínimos; fornecê-lo apenas ao terminal privado, nunca ao chat.
2. Usar somente a versão auditada de `scripts/meg-stage09-safe-vault-rootkey.sh` da branch Draft após validar hash/script. O script utiliza GET da Management API para `/v1/projects/<ref>/pgsodium`, exige campo JSON `root_key` de 64 hex e salva o material diretamente cifrado por `age`, fora do Git; não executá-lo nesta etapa de planejamento.
3. Guardar o arquivo cifrado e seu manifesto em **custódia separada** do backup SQL e da identidade `age`. O arquivo cifrado pode ter redundância, mas a chave que o abre e qualquer passphrase não devem ficar na mesma mídia sem controles adicionais.
4. Fazer depois um teste **privado** de leitura e formato do material cifrado, sem imprimir o valor nem registrá-lo. Não tratar sucesso da leitura como sucesso de restauração.
5. Em eventual **projeto Supabase novo e isolado**, autorizado e com custo conhecido, seguir fluxo oficial de migração manual: copiar chave-raiz original para o **projeto novo** somente quando necessário para que os dados cifrados sejam legíveis. **Jamais usar PUT no projeto original**. Os fluxos gerenciados “Restore to a new project”/Branching podem transportar a chave automaticamente, mas não são presumidos disponíveis no plano Free.

### 5. Matriz de recuperação dos componentes gerenciados

| Componente | Evidência atual | Dependência e procedimento futuro no projeto novo | Gate |
| --- | --- | --- | --- |
| `public` financeiro | 32 tabelas restauradas localmente, dados V4/V5/V6/V8 diagnosticados | Reproduzir schema/dados com script adequado ao **novo** Supabase; comparar integridade referencial, contagens, funções e autoridades financeiras sem reimplementar regras | PENDENTE no Supabase |
| `vault` / pgsodium | 1 entrada inventariada; nenhum valor lido | Chave-raiz do original guardada e recuperável, restauração controlada dos dados e teste sintético/privado de desencriptação no projeto novo | CRÍTICO |
| `auth` gerenciado | 27 tabelas internas, `auth.users=0` na consulta | Recriar configurações Auth, provedores, templates, políticas de sessão/JWT e customizações; não copiar cegamente tabelas de serviço. Distinguir login próprio MEG da plataforma Auth | PENDENTE |
| `storage` gerenciado | 0 buckets/objetos no inventário | Confirmar novamente inventário no dia do ensaio; se houver objetos, copiar **bytes** via Storage API além de metadados SQL; reconstituir buckets e policies | PENDENTE |
| RLS, GRANT, roles e Data API | Auditoria read-only concluída; `public` 32 RLS, 0 policies e 0 grants diretos para `anon/authenticated` | Testar contratos de acesso/negação no destino com perfis fictícios e permissões pretendidas, mantendo deny-by-default onde for intencional | PENDENTE |
| Extensões, `pg_net`, watchdog e cron | 7 extensões inventariadas; #676 aberta | Inventariar versões, schema, agendamentos/dependências; não mover `pg_net` nem executar watchdog; recriar somente após revisão em destino isolado | PENDENTE |
| Realtime e publicações | Não homologado | Inventariar canais/publicações/config e reativar seletivamente no destino, sem disparos para sistemas reais | PENDENTE |
| Edge Functions | Inventário funcional ainda não homologado | Revisar lista e fontes versionadas/deploys, import maps e `deno.json`; restaurar em ambiente isolado com variáveis fictícias | PENDENTE |
| Configurações e chaves de plataforma | Não cobertas pelo `pg_dump` | Inventário de Auth Settings, API keys, URL, JWT, domínios, CORS, webhooks, roles, certificados TLS e variáveis; reemitir/rotacionar quando apropriado | PENDENTE |
| Render e integrações externas | Build Command potencialmente destrutivo e Egress restrito no checkpoint | Auditar configuração e dependências sem reproduzir segredos; não apontar aplicação para novo banco até aprovação e plano de corte/rollback | CRÍTICO |
| Backup recorrente, retenção e alertas | Backup real pontual existente; nenhuma rotina aprovada | Definir frequência, retenção, RPO/RTO, teste periódico de abertura e alerta de falha; evitar simular PITR no Free | PENDENTE |

### 6. Ordem proposta e aceite futuro

1. **Agora, sem produção:** inventário de evidências existentes, preparação do procedimento de custódia e confirmação física pelo operador (apenas resultado sanitizado); não montar/restaurar `meg_restore_drill` nem rodar novo `pg_dump`.
2. **Somente com aprovação separada:** recuperar a chave-raiz Vault com GET oficial em terminal privado, criptografar, testar o envelope e guardar em local separado.
3. **Somente com custo e autorização explícitos:** criar projeto Supabase isolado. Reconstituir componentes pela documentação oficial, sem habilitar notificações reais, webhooks externos, cron produtivo ou alterar projetos existentes.
4. Validar funções e segurança com dados sintéticos e, quando formalmente autorizado, testar dados recuperados com políticas de privacidade e sem expor conteúdo. Registrar inconformidades, rollback e custos.
5. Resolver Render/Egress, política recorrente e governança #674/#676 antes de considerar merge/deploy. Não declarar Etapa 09 encerrada antecipadamente.

**Critério de aceite de custódia offline:** `CÓPIA_FÍSICA_PRESENTE` + `CHAVE_PÚBLICA_IGUAL` + `CANARY_OK` + `DESBLOQUEIO_INDEPENDENTE` + `MÍDIA_DESCONECTADA`, todos atestados pelo operador. Sem isso, **PENDENTE**.

### 7. Fontes oficiais consultadas em 12/11/2026

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/database/vault
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/database/extensions/pg_net
- https://supabase.com/changelog.md (CLI v3, 04/11/2026: padrão local; não atualizar nem executar migração neste gate).

**Nota de limites:** documentação oficial pode mudar; rever na data do ensaio. Nenhuma afirmação acima equivale à execução de Vault GET, download de segredos ou restauração em projeto novo.

### 8. Evidência posterior: custódia da identidade age operacional (12/11/2026)

Esta seção **atualiza** a linha de base inicial deste documento, que havia sido escrita antes da conferência real do USB. Os estados de planejamento acima devem ser lidos como históricos, e não como o último resultado do gate da identidade `age`.

- Identidade privada `age` no WSL: ferramentas, permissões e identidade local reportadas `OK` pela versão 2 do verificador, executada no notebook.
- Pendrive E: USB, FAT32, aproximadamente 7,26 GiB, sem BitLocker; copiado **somente o criptograma** `identidade.age` protegido por `age -p` e senha, sem formatar e sem modificar os arquivos antigos conforme os relatórios do operador.
- Verificação criptográfica da cópia: `HASH_CIFRADO_USB=OK`, `RECUPERACAO_USB=OK`, `LIMPEZA_STAGE_WSL=OK`, `RESULTADO=COPIA_CIFRADA_E_RECUPERACAO_OK`.
- Custódia física: operador atestou retirada física, senha separada e pendrive guardado separado. Diagnóstico final read-only retornou `CANDIDATOS_CAPACIDADE_7_26GB=0`, `UNIDADE_E_PRESENTE=False`, embora outro disco USB continue conectado, o que não interfere na conferência do pendrive-alvo.
- **Aceite restrito:** `CUSTODIA_OFFLINE_IDENTIDADE_AGE=OPERACIONAL_COM_EVIDENCIAS_E_ATESTADO_DO_OPERADOR`. Aceite não equivale a prova forense independente, criptografia do volume FAT32, backup integral do Supabase, resgate da chave-raiz Vault ou continuidade de todos os serviços gerenciados.
- **Pendências obrigatórias:** custódia da chave-raiz Vault, recuperação de Auth/Storage/extensões/funções e demais componentes gerenciados, testes de recuperação integral, políticas de backup recorrente e questões #674/#676. Não realizar GET Vault, restaurar, conectar ao banco ou alterar produção sem autorização específica; PR #666 permanece Draft sem merge/deploy.
