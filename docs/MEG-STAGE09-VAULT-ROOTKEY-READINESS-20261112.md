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
