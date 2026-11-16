# MEG Web Evolution | Etapa 10 | Prism operacional com leitura real opt-in

Data: 16/11/2026. Branch isolada `stage10/prism-real-read-optin-20261116`. PR #696 Draft, derivada da PR #688 no commit `d15ae63455a92b1d66b058ee216490464093493b`.

## Objetivo e implementação

O front-end operacional passa a poder montar o layout Prism 2.0 da Etapa 10 a partir da sessão real já existente, sem importar dados ou autenticação da QA fictícia. A flag `VITE_PRISM_LAYOUT` é **false por padrão**; somente o valor literal `true` ativa o caminho novo. A Home e o caminho operacional antigo não são substituídos. Não há escrita financeira ativada.

- `apps/web/src/meg-web-evolution/main.tsx`: lazy import condicional da composição, respeitando a sessão do `AuthGateway`, com o fluxo original intacto quando a flag não está ativa.
- `apps/web/src/meg-web-evolution/launches/OperationalLaunches.tsx`: reusa a consulta já existente de `FinancialEvent` não arquivado, `GET /finance/summary`, `GET /finance/accounts`, `GET /finance/categories`, `GET /finance/payment-methods` e `GET /finance/sync-status`, mais `GET /cards` apenas em Prism. Não soma `AppState.transactions`; os totais vêm do read model canônico do servidor. Propriedade `account.type` é preservada apenas na modalidade opt-in. Falhas são explícitas, sem fixture.
- `apps/web/src/meg-web-evolution/integrated-qa/PrismOperationalLaunches.tsx`: adaptador dos DTOs reais para `ExpenseForm`, `PrismLaunchChoice` e autocomplete. Usa IDs explícitos de contas, categorias, métodos e cartões; não faz match por nome; não transforma benefício/Verocard em cartão de crédito. O formulário Novo/Editar recebe `saveEnabled={false}`. Em registros que não cabem no editor monetário, não inventa dados e informa bloqueio.
- `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx` e `stage10/LaunchActionsQa.tsx`: ações da QA preservadas para a prévia fictícia, mas modo operacional de leitura impede edição em lote e desabilita duplicação, baixa e arquivamento. Edição abre apenas o formulário sem gravação.
- Teste de contrato `scripts/meg-stage10-prism-real-read-optin.contract.test.mjs` e workflow isolado `.github/workflows/meg-stage10-prism-real-read-optin.yml` não acessam banco, API, Render ou segredos.

## Evidências de CI

Workflow [#43853377584](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43853377584): `npm ci` SUCCESS, contrato estático PASS, `vite build` com flag false SUCCESS, varredura de bundle sem padrões de segredos PASS, `vite build` com flag true SUCCESS, nova varredura PASS.

**Gate estrito TypeScript vermelho**, três erros preexistentes relacionados à Home: `HomeDashboard.tsx:218` (TS2550) e `home-commitments-read.ts:60,62` (TS7022). A tabela da Etapa 10 recebeu anotação de tipo sem alteração funcional para remover o seu próprio TS2322. Não alterar a Home só para mascarar o histórico. CI global dessa nova PR não está verde.

## Banco real

Nenhuma escrita. Consultas executadas dentro de `BEGIN TRANSACTION READ ONLY` confirmaram, para workspaces com proprietário membro ativo: contas `checking=1`, `benefit=1`; formas de pagamento `bill=1`, `credit=2`, `instant=1`, `other=13`. São contagens por tipo, **não** dados incluídos no bundle.

## Bloqueios antes de ativação real

1. O login operacional atual escreve `User.lastLoginAt` e cria/renova `AuthSession`. Isso **não atende** à restrição histórica de absolutamente nenhuma escrita no banco real. Nenhum login contra o banco real foi executado nesta rodada.
2. O resolvedor de workspace da API pode chamar `ensurePrimaryWorkspace`, que escreve em fallback; a API principal também possui manutenção de inicialização. A mudança de UI não elimina esses riscos.
3. O acesso da API usa `DATABASE_URL`, mas o papel real de conexão não foi validado. A auditoria com papel `postgres` apresentou `BYPASSRLS=true`, com `pg_policies=[]`. Não ativar publicamente sem isolamento comprovado.
4. Não foram executados teste HTTP autenticado com dados reais, captura de registro real em tela, teste de outros workspaces, viewport/evidência visual e homologação explícita do novo caminho.
5. `VITE_PRISM_LAYOUT` permanece desligada por padrão. Não houve merge, deploy, alteração de produção, Android, Render, banco, schema ou writers. `server.ts` e a rota `POST /finance/batch-edit/card-cycle/preview` permaneceram intocados.

## Próximo passo exato

Resolver os gates de autorização de sessão e leitura sem efeitos colaterais usando ambiente de teste isolado; validar a conexão e CORS reais sem escrever dados financeiros, testar os oito viewports e solicitar aprovação visual do novo caminho. Não ativar a flag em produção nem mesclar PR #696/#688 antes de evidências técnicas e aprovação.

## Complemento: browser sintético com oito viewports e screenshots (16/11/2026)

Workflow [#43856294995](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43856294995), commit `3e31e1b9b3df32e6abb6465f9a3eb9e608857de8`, executado em GitHub Actions com Google Chrome, Vite, servidor estático em loopback e respostas financeiras **sintéticas**. Nenhuma credencial real, login real, banco real, writer ou API de produção acessados neste gate.

Resultado bruto relevante:

```text
MEG_STAGE10_PRISM_REAL_READ_OPTIN_STATIC_GATE PASS
MEG_STAGE10_BUNDLE_SECRET_GUARD PASS
MEG_STAGE10_PRISM_REAL_OPTIN_BUILD PASS
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 390x844
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 640x900
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 960x900
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 1024x768
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 1366x768
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 820x360
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 1024x450
MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS 1920x1080
MEG_STAGE10_PRISM_SYNTHETIC_BROWSER_PASS
```

Foram inspecionados: evento sintético no DataGrid, menu com duplicação/baixa/arquivo bloqueados, formulário de edição com valores DTO e salvar indisponível, novo lançamento com salvar indisponível, nenhuma requisição mutante, nenhum endpoint de API inesperado, nenhuma requisição de dados `fetch`/XHR a terceiros. A fonte de Google Fonts dos CSS aprovados foi abortada pelo runner e não foi contada como `fetch` de dados. Nenhuma alteração do CSS homologado.

Capturas do navegador disponibilizadas no [artefato GitHub Actions #14219709412](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43856294995/artifacts/14219709412), expiração anunciada em 23/11/2026.

O gate `npx tsc -b` continua com **FAIL**, exclusivamente:
```text
src/meg-web-evolution/home/HomeDashboard.tsx(218,87): TS2550 replaceAll
src/meg-web-evolution/home/home-commitments-read.ts(60,9): TS7022 query
src/meg-web-evolution/home/home-commitments-read.ts(62,9): TS7022 page
```
Esses três erros estão em arquivos não alterados, protegidos na Etapa 10. **CI geral vermelho, apesar dos builds Vite e do browser passarem.** Não fazer merge/deploy nem declarar leitura real homologada.

Mudança mínima adicional em `ExpenseForm.tsx`: prop opt-in `readOnlyRealData` altera somente rótulos de QA para rótulos verdadeiros quando o formulário exibe DTOs autenticados. Com a prop ausente, a QA homologada mantém os textos originais, sem alteração de CSS, layout ou operação financeira.

A prova com uma sessão real e eventos reais apresentados no navegador continua **pendente**. O login atual escreve metadados de autenticação, e a API pode executar mutação em fallback de workspace; nenhum deles foi executado neste teste.
