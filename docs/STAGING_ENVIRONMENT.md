# Ambiente de testes do MEG

Este projeto publica duas versões da aplicação web no GitHub Pages:

- Produção: `https://marcosvilalva.github.io/MEG-Platform/`
- Testes/staging: `https://marcosvilalva.github.io/MEG-Platform/staging/`

## Como o staging funciona

O staging é compilado com:

- `VITE_APP_ENV=staging`
- `VITE_VALIDATION_MODE=true`
- `VITE_PUBLIC_BASE_PATH=/MEG-Platform/staging/`
- `VITE_API_URL=http://127.0.0.1:9`, salvo se `VITE_STAGING_API_URL` for configurado explicitamente
- `VITE_STAGING_USERNAME=admin@meg.test`
- `VITE_STAGING_PASSWORD=meg-teste`

Isso significa que ele abre em modo de validação local, sem gravar alterações na nuvem oficial.

## Segurança

GitHub Pages é público por natureza. Qualquer pessoa com o link pode baixar o código da interface.

Por isso, o staging possui três proteções práticas:

1. não aponta para a API oficial;
2. usa cache/sessão separados;
3. exige login e senha simples de acesso antes de abrir a interface.

Esse login não deve ser considerado segurança bancária, porque aplicação estática sempre roda no navegador do usuário. Ele serve para bloquear acesso casual.

Regra operacional: não importar base real no staging público. Para testar dados sensíveis, usar base fictícia, mascarada ou um ambiente protegido por Cloudflare Access.

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

## Funcionalidades experimentais

O staging pode exibir recursos que ainda não aparecem na produção. Exemplo atual:

- painel `Consultor MEG`, com score gerencial, margem após pendências, maior risco e próxima ação recomendada.

Esses recursos devem ser aprovados visualmente e funcionalmente antes de serem liberados na URL oficial.

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

Se quiser trocar as credenciais simples do staging, configure também:

```text
VITE_STAGING_USERNAME=seu-email-de-teste
VITE_STAGING_PASSWORD=sua-senha-de-teste
```

Enquanto `VITE_STAGING_API_URL` não existir, o staging continua em modo local de validação e não usa a API oficial.
