# MEG Web Evolution | Etapa 09 | Alternativa local sem cota gerenciada

## Motivacao e limites

Em 14/11/2026, o operador confirmou no Dashboard da organizacao MEG Vilalva o consumo de Egress **14,596 / 5 GB (292%)** no plano Free, ciclo **27/10 a 27/11**. O sandbox `oxwmqbzeuiibdlkcbjzv` exibe **Servicos restritos** e estado nao saudavel. As respostas HTTP 402 de Auth/Storage, antes observadas por amostra de logs, sao coerentes com o bloqueio de cota. O projeto principal `ugbiqzaqnrhulhetevby` nao pode ser usado para ensaio.

**Nao ha atalho sem custo garantido para remover o HTTP 402 antes da renovacao.** A FAQ oficial confirma que restricoes por cota sao retiradas apos renovacao, possivelmente com atraso. Criar outra organizacao, trocar projeto, desligar protecao de quota, contratar Pro ou transferir a origem nao e o caminho autorizado.

Para **continuar a caracterizacao antes do fim do ciclo**, esta branch Stage09 incluiu um smoke **real** de Auth/Storage **no stack local do Supabase CLI v3**, usando GitHub Actions em repositorio publico. Os runners standard GitHub-hosted sao gratuitos para repositorios publicos segundo docs oficiais. Zero acesso a hosted Supabase, zero acesso a Render ou a backups do usuario.

Fontes:
- https://supabase.com/docs/guides/platform/billing-faq#fair-use-policy
- https://supabase.com/docs/guides/local-development
- https://supabase.com/changelog/supabase-cli-v3
- https://docs.github.com/en/actions/concepts/billing-and-usage

## Arquivos

- `.github/workflows/meg-stage09-supabase-local-auth-storage.yml`: executa exclusivamente na PR #666, head stage09 conhecido/base main e mesmo repositorio. Sem secrets, com token remoto vazio, runner Ubuntu descartavel, Docker local, Node 22 e Supabase CLI pinada em `3.1.0`.
- `scripts/meg-stage09-local-supabase-smoke.mjs`: falha fechada se falta `CI/GITHUB_ACTIONS`, se qualquer token remoto ou DATABASE_URL externo estiver definido ou se a URL da API local nao for `http://localhost:54321` ou `http://127.0.0.1:54321`. Todos os requests HTTP sao enviados **apenas** a `127.0.0.1:54321`, sem redirects.
- O projeto Supabase CLI e criado em `$RUNNER_TEMP/meg-stage09-supabase-local`, **fora do checkout**; `supabase init`, `start`, `status` e `stop --no-backup` executam somente no runner descartavel. Nunca `--remote`, `link`, `db pull`, credenciais reais, SMTP externo ou projeto da organizacao. Nao sobrescreve nenhum PostgreSQL 17 local do usuario nem dados em WSL.

## Testes propostos e resultado a registrar

1. Auth settings via HTTP real local.
2. Criacao de usuario sintetico `@example.invalid` ja confirmado via admin endpoint local (nao envia email a terceiro).
3. Login por senha, validacao de identidade por JWT e negativa de senha incorreta.
4. Criacao de bucket privado inteiramente ficticio; upload de bytes sinteticos, download privilegiado e igualdade byte a byte.
5. Negativa a acessos de usuario anonimo, usuario autenticado **sem policy** e URL publica.
6. Cleanup do stack e arquivo temporario de chaves locais. Nenhum email real, telefone, API de producao ou dados MEG.

**A prova nao valida**: migracao dos schemas gerenciados Auth/Storage, Vault root key original, quotas/seguranca da nuvem, entregabilidade de emails reais, Realtime hospedado, cron/pg_net, RTO medido de recuperacao do MEG, RPO, integridade de dump real ou restore no sandbox remoto.

**Status inicial:** PROVA EM EXECUCAO/DEPENDENTE DE CI. Se a CI falhar na inicializacao do stack, versao CLI, limite de recursos ou API, corrigir apenas workflow/fixture isolado; **nunca** contornar limitacoes ativando quota/cobranca, alterando dados reais ou removendo negacoes de seguranca. So mudar o estado para PASS depois de verificar run no SHA concreto.

**Status dos gates oficiais:** Gate 0 provisionamento PASS previo; Gate 1 gerenciado continua BLOQUEADO POR COTA; Gate 2 em Supabase hospedado NAO EXECUTADO; Gate 3 restore remoto NO-GO; Gate 4 aceite/RTO/RPO NO-GO. CI local SUCCESS **nao substitui** esses gates. A PR #666 continua Draft sem deploy/merge main, Android congelado, Web homologada intacta.

## Alternativa para desbloqueio gerenciado

Solicitar ao suporte Supabase esclarecimento sobre restricao da organizacao e possibilidade de liberacao antecipada sem custo pode ser feito pelo operador, sem garantia de concessao. Nao solicitar upgrade ou migracao. A data oficial do ciclo segue 27/11/2026, sujeita a atraso no restabelecimento. Antes de qualquer restauracao gerenciada, seguir matriz de DR de `docs/MEG-STAGE09-SUPABASE-MANAGED-RESTORE-DRILL-20261112.md`.
