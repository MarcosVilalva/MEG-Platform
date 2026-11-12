# MEG Finanças Web Evolution | Etapa 09
## Pré-requisitos de salvaguarda da chave-raiz Vault | 12/11/2026

**STATUS: PRÉ-EXECUÇÃO VALIDADA SOMENTE COM DADOS SINTÉTICOS. SEM GET REAL. SEM RECUPERAÇÃO DO VAULT.**

Esta especificação complementa o [runbook](./MEG-STAGE09-BACKUP-RECOVERY-RUNBOOK-20261110.md), o [plano de custódia offline](./MEG-STAGE09-CUSTODIA-OFFLINE-RECUPERACAO-GERENCIADA-20261112.md) e `MEG-WEB-CONTINUIDADE-OFICIAL.md`. Escopo isolado: branch `stage09/backup-recovery-kit-20261110`, PR #666 Draft. Nenhuma mudança no Supabase produtivo, banco WSL restaurado, Android, Web homologada ou Render.

### 1. Baseline e condição de segurança

- A identidade privada `age` possui cópia externa cifrada por senha no pendrive, cujo hash/recuperação foram conferidos em relatório local; mídia desconectada, senha guardada separadamente, segundo atestados do operador. **Não reconectar o USB neste pré-gate.**
- O backup real do schema `public` foi restaurado em PostgreSQL 17 isolado. Não constitui restauração de serviços gerenciados nem contempla a chave-raiz Vault.
- Inventário anterior: **1 linha em `vault.secrets`**, sem ler valor secreto. Não há evidência de que o dado em Vault tenha sido efetivamente restaurado ou decifrado após desastre.
- O Supabase administra a chave-raiz Vault fora do banco. Em migração manual `pg_dump/pg_restore` para projeto novo, os dados cifrados não são decifráveis com a chave nova por padrão. Recuperação no mesmo projeto e fluxo gerenciado de restauração podem preservar a chave, mas não devemos presumir disponibilidade no plano Free.
- Documentação oficial: [Supabase Vault](https://supabase.com/docs/guides/database/vault) e [GET pgsodium config](https://supabase.com/docs/reference/api/v1-get-pgsodium-config).

### 2. Auditoria estática do exportador da branch Draft

Arquivo: `scripts/meg-stage09-safe-vault-rootkey.sh`. Verificação estática em 12/11/2026:

1. Fixa o projeto de origem `ugbiqzaqnrhulhetevby`; operação implementada é **GET**, nunca PUT.
2. Utiliza HTTPS, sem seguir redirecionamentos, com limites de tempo/tamanho e sem imprimir PAT na linha de comando do `curl`. Usa configuração do `curl` por stdin. O PAT ainda existe na memória/ambiente dos processos locais: **não utilizar `set -x`**, gravação de terminal, ferramentas de assistência remota nem logs compartilhados.
3. Exige resposta JSON contendo `root_key` hexadecimal com 64 caracteres. Não imprime a chave nem a grava em arquivo plaintext.
4. Cifra o valor para destinatário público `age` e testa a abertura local com a identidade privada, sem imprimir o conteúdo. Gera manifesto com SHA-256 **do arquivo cifrado**, não da chave em claro.
5. Rejeita salvar dentro do repositório, mas **não verifica automaticamente a separação física** entre diretório Vault, backup financeiro e custódia da identidade `age`. Isto permanece gate operacional.
6. Um êxito do exportador provaria apenas arquivo de chave-raiz cifrado e decifrável no ambiente original. **Não comprovaria** leitura de todos os segredos, recuperação gerenciada nem RTO/RPO.

### 3. Resultados de testes sintéticos no GitHub

A suíte `scripts/meg-stage09-backup-safety.test.mjs` foi ampliada para incluir:
- resposta válida da API com `root_key` fictícia, cifragem e ausência de conteúdo/token nos diagnósticos;
- JSON malformado;
- chave `root_key` ausente;
- chave de tamanho inválido;
- resposta excessivamente grande;
- erro HTTP sintético;
- falha de autenticação da descriptografia `age`;
- token malformado com quebra de linha.

Critério em cada falha: **retorno não zero, nenhum arquivo novo publicado no diretório final, nenhum PAT fictício ou chave-raiz em stdout/stderr**. O mock de `curl` não acessa a rede, e os valores são fictícios. Suíte e scripts continuam sujeitos ao gate CI do SHA final: testes anteriores não substituem testes do novo commit.

### 4. Condições antes de autorizar o GET real

- [ ] Aprovação **explícita e separada** do responsável para consultar a chave-raiz do projeto produtivo, mesmo sendo leitura.
- [ ] Confirmar que o projeto Supabase segue ativo e que o endpoint ainda está disponível. A documentação classifica o GET `/v1/projects/{ref}/pgsodium` como **experimental/Beta**; permite escopo OAuth `secrets:read` e requer, para token fine-grained, permissão `project_admin_write` segundo referência publicada. Esse nome de permissão é amplo; preferir credencial curta, privada e revogável, sem divulgá-la.
- [ ] Não usar plugin, chat, CI, Work, navegador compartilhado ou banco SQL para extrair a chave. Inserir credencial apenas no terminal privado com entrada oculta. Não salvar credencial em arquivo de histórico ou repositório.
- [ ] Confirmar destino **criptografado e separado** do backup SQL e da identidade `age`. O arquivo `.rootkey.age` pode ser copiado depois para armazenamento offsite controlado, mas não deve ficar na mesma mídia que a identidade privada sem proteção adicional.
- [ ] Confirmar destinatário `age` derivado da identidade correta, em dispositivo local confiável, sem publicar material privado.
- [ ] Verificar o script/commit real antes de executar. Não executar versão antiga ou ZIP desatualizado; evitar modificações de scripts durante a janela de custódia.
- [ ] Planejar registro sanitizado com `GET=OK/ERRO`, `ARQUIVO_CIFRADO=OK/ERRO`, `HASH=OK/ERRO`, `ABERTURA_LOCAL=OK/ERRO`, `LOCAL_SEPARADO=ATESTADO/PENDENTE`, `VAULT_RESTORE=NAO_TESTADO`. Nunca colar token, root_key, identidade privada ou arquivo cifrado no chat.

### 5. Gates proibidos nesta rodada

**Não executar** GET real, PUT no endpoint de `pgsodium` (pode inutilizar segredos existentes), `vault.decrypted_secrets`, backup novo, restore novo, criação de projeto, mudança de plano, RLS/GRANT, watchdog/`pg_net`, Deploy/Render, merge ou qualquer operação produtiva. O objetivo é apenas governança, segurança do kit e teste sintético.

### 6. Próximas etapas planejadas

1. Após aprovação específica, operador realiza apenas o **GET** e cifragem local auditada, com token privado e saída sanitizada. Nenhum dado secreto será enviado ao chat.
2. Confere hash e reabertura do arquivo cifrado; registra custódia separada e teste de disponibilidade offsite.
3. Somente após autorizações técnicas e de custo, projeto Supabase novo **isolado**: migrar dados e configuração conforme procedimento oficial e validar restauração Vault em ambiente sem integração real. **Nunca PUT no projeto de origem.**
4. Recuperar/validar Auth, Storage (incluindo objetos quando houver), Realtime, funções, extensões, regras de segurança e Render de forma independente. Não declarar a Etapa 09 encerrada só pela chave Vault.

**Fontes oficiais verificadas em 12/11/2026:**
- https://supabase.com/docs/guides/database/vault
- https://supabase.com/docs/reference/api/v1-get-pgsodium-config
- https://supabase.com/docs/reference/api/v1-update-pgsodium-config
- https://supabase.com/changelog.md (breaking change CLI v3 em 04/11/2026; nenhuma atualização CLI autorizada).


### 7. Autorização específica do operador e ferramenta local (12/11/2026)

- **Autorização explícita recebida do operador:** `autorizado`, em resposta à solicitação específica para GET leitura da chave-raiz Vault e cifragem local. Não abrange PUT, rotação da chave, SQL Vault, alteração do Supabase, novo projeto, migração, merge, deploy ou leitura dos segredos armazenados.
- **Fato operacional:** esta execução requer acesso ao terminal Windows/WSL privado do operador e um token Supabase temporário de escopo restrito; o agente não possui acesso ao terminal nem recebe PAT/chave. **GET real não executado por ferramenta externa nem pelo agente até a confirmação posterior do operador.**
- **Documentação Supabase revisada novamente:** API GET `/v1/projects/ugbiqzaqnrhulhetevby/pgsodium` experimental/Beta, `secrets:read` em OAuth ou `project_admin_write` para PAT fine-grained. O mapeamento de token escopado atual indica Project Settings **Read-write** para GET pgsodium. Essas permissões são amplas apesar da operação GET ser só leitura; token de projeto único e expiração curta, revogação após obter evidência.
- **Script avulso local preparado nesta conversa (fora do Git e SEM segredos no código):** `MEG-ETAPA09-VAULT-GET-CIFRADO-LOCAL.ps1`, SHA-256 `7726c732ead78548292aec14f2ec90dc11340253fc57a45a227a10a19c5aaa4c`; ZIP de transporte SHA-256 `e3cf18e9271bfb1a595a81ae9f84598f9832ec16931ad89ea423897b0513c57c`. Verifica igualdade de SHA Windows/WSL e sintaxe Bash, usa prompt sem eco no `/dev/tty` Linux, token somente em variável de shell, usa HTTPS GET via curl `-q --fail --config -` sem redirecionamento, parser de `root_key` 64 hex, criptografia `age` para a identidade local, prova de decifragem por hash e manifesto cifrado em diretório `0700` fora do Git. Copia **somente relatório sanitizado** para clipboard no PowerShell. Não reconecta USB offline.
- **Validação alcançada neste ambiente:** código Bash `bash -n` PASS; quatro cenários com `curl`/`age` simulados em PTY Linux, sucesso de criptograma/manifesto e falha segura para HTTP, JSON inválido e root_key curta, sem credencial/chave no stdout. **NÃO TESTADO:** execução PowerShell 5.1 no computador do operador, GET real, token real, age real, resposta real da API. A suíte anterior em CI cobre contratos adicionais; não confundir simulações com GET/backup real.
- **Destino da futura execução:** `/home/m_vil/.meg-stage09-vault-encrypted` no WSL, dentro do SSD local e separado em pasta privada da identidade age. **Ainda NÃO é cópia externa/offsite nem custódia independente; a custódia do criptograma fica PENDENTE mesmo se o GET for OK.** Nenhum conteúdo da chave-raiz ou PAT deve ir para chat/Git/CI; somente marcadores.
- **Próximo passo:** operador cria PAT temporário exclusivo para o projeto, baixa e verifica hash do pacote, executa no Windows PowerShell e fornece relatório sanitizado; depois revoga token. Se `GET=OK`, verificar uma cópia cifrada em custódia externa separada, sem incluir a identidade privada na mesma mídia, em etapa posterior.


### 8. GET Vault real concluído localmente, prova de custódia offsite pendente (12/11/2026)

**Esta seção atualiza o plano anterior, originalmente redigido antes da autorização e execução.** O status histórico do item 4 já foi ultrapassado quanto ao GET, mas não quanto à custódia independente ou restauração.

- Operador autorizou expressamente a operação GET e executou no Windows/Ubuntu WSL o procedimento privado, com token criado especificamente para o projeto `meg-financas`.
- Relatório automático, sem dados sensíveis: `GET=OK`, `ARQUIVO_CIFRADO=OK`, `ABERTURA_LOCAL=OK`, `HASH_CIFRADO=OK`, `MANIFESTO=OK`, `CODIGO_WSL=0`, `RESULTADO=EXPORTACAO_LOCAL_CIFRADA_OK`, `ROOT_KEY_NO_RELATORIO=NAO`, `TOKEN_NO_RELATORIO=NAO`, `OPERACAO_SUPABASE=SOMENTE_GET`, `LIMPEZA_SCRIPT_WSL=OK`.
- **Aceite restrito:** consulta da chave-raiz Vault e salvaguarda cifrada **local** validadas pelo relatório do operador. Não houve PUT, banco SQL, restore ou modificação de segredo. Destino WSL local não é evidência de custódia offsite nem prova de restauração do Vault.
- **URGENTE, ainda não atestado:** revogar o PAT temporário gerado para o GET no Supabase, sem compartilhar token, e registrar apenas `PAT_REVOGADO=SIM` após confirmação real no painel.
- **PENDENTE:** guardar offsite **somente o criptograma `.rootkey.age` e seu manifesto**, sem incluir identidade age privada, e validar hash SHA-256 após transferência, preferencialmente em destino distinto do backup SQL. Manter o pendrive `age` offline e senha de desbloqueio separados; não retornar a exportar a chave ou reconectar pendrive para esta etapa.
- **PENDENTE / NO-GO:** recuperação de Vault em projeto Supabase novo isolado, Auth, Storage, Realtime, Functions, configurações gerenciadas, backup recorrente e controles #674/#676. Exige autorizações próprias de custo/infraestrutura e não integra a conclusão do GET.
