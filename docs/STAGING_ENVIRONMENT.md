# Ambiente de testes do MEG

Este projeto publica duas versões da aplicação web no GitHub Pages:

- Produção: `https://marcosvilalva.github.io/MEG-Platform/`
- Testes/staging: `https://marcosvilalva.github.io/MEG-Platform/staging/`

## Como o staging funciona

O staging é compilado com:

- `VITE_APP_ENV=staging`
- `VITE_VALIDATION_MODE=false`
- `VITE_PUBLIC_BASE_PATH=/MEG-Platform/staging/`
- `VITE_API_URL=https://meg-platform-api.onrender.com`, salvo se `VITE_STAGING_API_URL` for configurado explicitamente
- `VITE_STAGING_ADMIN_EMAIL=m_vilalva@hotmail.com`

Isso significa que o staging usa o mesmo login real da produção, mas mantém chaves de sessão/cache separadas no navegador.

## Controle de acesso

GitHub Pages é público por natureza. Qualquer pessoa com o link pode baixar o código da interface.

Por isso, o staging possui uma trava adicional no frontend:

1. o usuário precisa autenticar pela API real;
2. somente o e-mail configurado em `VITE_STAGING_ADMIN_EMAIL` pode continuar;
3. qualquer outro usuário autenticado tem a sessão descartada no staging.

O administrador padrão do staging é:

```text
m_vilalva@hotmail.com
```

## Cuidado operacional

Como o staging usa a API real por decisão operacional, qualquer alteração feita nele pode atingir dados reais do usuário autenticado.

Use o staging para validar visual, navegação e regras antes de liberar telas novas na URL oficial. Para testes destrutivos, use uma base fictícia ou configure `VITE_STAGING_API_URL` apontando para uma API separada.

## Isolamento local do navegador

As chaves de sessão/cache são separadas por ambiente.

Produção mantém as chaves históricas:

- `meg-access-token`
- `meg-refresh-token`
- `meg-auth-user`
- `meg-financas-state-v4-paid-fixes`
- `meg-cloud-revision-v1`

Staging usa chaves com sufixo:

- `meg-access-token-staging`
- `meg-refresh-token-staging`
- `meg-auth-user-staging`
- `meg-financas-state-v4-paid-fixes-staging`
- `meg-cloud-revision-v1-staging`

Essa separação evita conflito de sessão no mesmo navegador, mas não isola o banco quando o staging aponta para a API real.

## Funcionalidades experimentais

O staging pode exibir recursos que ainda não aparecem na produção. Exemplo atual:

- painel `Consultor MEG`, com score gerencial, margem após pendências, maior risco e próxima ação recomendada.

Esses recursos devem ser aprovados visualmente e funcionalmente antes de serem liberados na URL oficial.

## Quando usar

Use o staging para:

- testar melhorias de layout;
- validar novas regras financeiras;
- revisar painéis experimentais;
- testar fluxo de cadastro, filtros e navegação;
- validar mudanças antes de considerar prontas para produção.

## Backend staging opcional

Se futuramente for criado um backend separado, configure a variável do repositório:

```text
VITE_STAGING_API_URL=https://sua-api-staging.exemplo.com
```

Se quiser trocar o administrador permitido no staging, configure:

```text
VITE_STAGING_ADMIN_EMAIL=outro-admin@exemplo.com
```
