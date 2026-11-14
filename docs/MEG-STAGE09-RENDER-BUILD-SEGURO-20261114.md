# MEG Etapa 09 | Proposta de Build Render da API sem mutação automática de dados

**Estado:** pronta para avaliação técnica em PR Draft isolada. **NÃO aplicada no Render**. Referências: checkpoint oficial PR #666; autoridade financeira `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`; issue [#691](https://github.com/MarcosVilalva/MEG-Platform/issues/691).

## Diagnóstico confirmado em 14/11/2026

Serviço real: `meg-platform-api`, Render Free, branch `main`, deploy ativo `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. A configuração atual possui:

```bash
npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production
```

As duas últimas chamadas não são build: `prepare-production.ts` pode executar `DELETE FROM "Budget"` para deduplicar por usuário, mês e grupo. `db:push:production` executa `prisma db push --accept-data-loss` e `ensure-performance-indexes.ts` cria índices. Qualquer novo deploy do serviço pode executar essas alterações automaticamente, independentemente da finalidade do deploy.

Inspeção somente leitura do Supabase produtivo em 14/11:

- A tabela `Budget` apresentava **0 linhas e 0 grupos duplicados**. Isso elimina a necessidade imediata de deduplicação no instante observado, mas não justifica deixar um DELETE automático no pipeline.
- Os sete índices financeiros exigidos por `ensure-performance-indexes.ts` já existiam no schema `public`. É fotografia do instante da verificação, não garantia de paridade futura.
- Nenhuma alteração foi executada no banco; sem exfiltrar registros ou consultar valores financeiros individuais.

## Proposta de Build Command (após gates e autorização de implantação)

```bash
bash scripts/meg-stage09-render-api-build.sh
```

O `--include=dev` garante TypeScript e Prisma CLI no build mesmo quando `NODE_ENV=production`, sem afetar o processo `start:api`. O script versionado executa exclusivamente `npm ci --include=dev --audit=false --fund=false`, `npm run db:generate` e `npm run build:api`. A expansão desses comandos corresponde a `prisma generate` e `tsc -p tsconfig.json`, não a migração, deduplicação ou DDL. O contrato fail-closed em `scripts/meg-stage09-render-api-build.contract.test.mjs` compara **a sequência inteira** a uma lista fechada e confirma os scripts npm chamados.

A workflow `.github/workflows/meg-stage09-render-api-safe-build.yml` constrói realmente a API com `DATABASE_URL=postgresql://ci:ci@127.0.0.1:65431/stage09_no_database?schema=public`, **sem qualquer serviço PostgreSQL provisionado**. Passar demonstra que o script compila sem necessidade de conexão ao banco e sem executar mutação SQL, mas não certifica nenhuma migração funcional futura.

## Sequência obrigatória antes de mexer na produção

1. Validar a branch e PR Draft, todos os testes e o build da API. Preservar o Android e a Web aprovados.
2. Confirmar backup cifrado recuperável de `public`, custódia externa de chaves e plano de restauração integral dos recursos Supabase, com gates formais da Etapa 09. **Atualmente Gate 1 PARCIAL; Gates 2 a 4 NO-GO.**
3. Revisar o schema desejado, migrations Prisma em versão e índices; jamais rodar `db push --accept-data-loss` em build nem deduplicação destrutiva automática. As eventuais correções de dados devem ser operações auditadas, transacionais e aprovadas separadamente.
4. Preparar janela operacional e procedimento de rollback que não dependa de executar o Build Command inseguro. Avaliar desativação do autodeploy ANTES de mudança do comando, pois atualização de configuração pode disparar publicação. Essa sequência exige checagem do comportamento atual do Render e autorização de execução específica.
5. Apenas após liberação, atualizar o Build Command no serviço de produção, validar que nenhuma operação de dados seja acionada, publicar pela branch aprovada e medir saúde operacional, erro, CPU/memória, revisão implantada e Egress. O merge em PR #666 e deploy são atos distintos que requerem seus respectivos gates.

## Estado e limitações

A PR adiciona proposta versionada, teste de contrato e CI. **Não modifica** `package.json`, Prisma/schema, writer financeiro, serviços externos, configuração Render, banco real ou qualquer tela.

**Critério P0:** zero comando de mutação DDL/DML automática no caminho de build. Não declarar produção preparada sem atualização explícita e prova operacional da configuração do serviço.

**Próxima ação:** obter todos os jobs verdes; manter PR Draft até que a recuperação de dados esteja concluída e a mudança controlada do Render esteja autorizada e sem risco de disparar deploy involuntário.
