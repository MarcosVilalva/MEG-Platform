# Ambiente de testes do MEG

Este projeto publica duas versões da aplicação web no GitHub Pages:

- Produção: `https://marcosvilalva.github.io/MEG-Platform/`
- Testes/staging: `https://marcosvilalva.github.io/MEG-Platform/staging/`

## Como o staging funciona

O staging é compilado com:

- `VITE_APP_ENV=staging`
- `VITE_VALIDATION_MODE=true`
- `VITE_PUBLIC_BASE_PATH=/MEG-Platform/staging/`

Isso significa que ele abre em modo de validação local, sem gravar alterações na nuvem oficial.

## Isolamento de dados

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

Essa separação evita contaminar o app oficial ao testar telas, importações ou alterações visuais.

## Quando usar

Use o staging para:

- testar melhorias de layout;
- validar novas regras financeiras;
- importar uma base de teste;
- testar fluxo de cadastro, filtros e painéis;
- validar mudanças antes de considerar prontas para produção.

## Backend staging opcional

Se futuramente for criado um backend separado, configure a variável do repositório:

```text
VITE_STAGING_API_URL=https://sua-api-staging.exemplo.com
```

Enquanto essa variável não existir, o staging continua seguro porque roda em modo local de validação.
