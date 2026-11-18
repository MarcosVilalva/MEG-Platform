# MEG Finanças Web Evolution | Etapa 10 | APK708: divergencia de estados na confirmacao Phoenix

**Data da evidência:** 18/11/2026  
**Escopo:** somente leitura do build Android publicado e testes sintéticos da fonte.  
**APK:** `MEG-Financas-708.apk`; pacote `br.com.megfinancas.app`; versionCode `708`; SHA-256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`, igual ao hash instalado segundo relatório ADB do operador.  
**Build original:** [GitHub Actions #36936495221](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/36936495221), commit `36c886b9597be95a28eb2add00f073e5f43f6fe0`.

## Evidência de código historico

- `apps/web/src/app/main.tsx` importa `../phoenix/simple-event-form-bridge`.
- `apps/web/src/phoenix/simple-event-form-bridge.ts` intercepta clique de Novo Lancamento e fluxo de beneficio quando nao e Edicao nem Cartao e chama `runPhoenixSimpleEventWrite` / `runPhoenixBenefitEventWrite`.
- O bridge exige `result.status === 'confirmed'`, caso contrario gera `PHOENIX_WRITE_NOT_CONFIRMED`.
- No `apps/web/src/phoenix/data/phoenix-write-gateway.ts`, ambas as funcoes, apos sucesso HTTP, retornam `{ status: 'accepted', ... }`. O estado `confirmed` aparece em callback de releitura posterior, mas **o bridge nao passa callback** ao invocar as funcoes.
- Portanto ha divergencia objetiva entre os contratos de retorno. Quando a rota do bridge e usada e o HTTP aceita a gravação, o bridge pode apresentar falso erro ao usuario sem reverter o lancamento. **Nao e comprovacao de duplicidade**, mas exige reconciliacao antes de tentar salvar novamente. Um segundo clique na mesma tela pode reutilizar operationId ainda em memoria; reabrir ou reiniciar pode nao preservar esse identificador, e o risco nao foi caracterizado funcionalmente.

## Evidencias reexecutaveis

1. `scripts/meg-stage10-apk708-bridge-status.contract.mjs`, fixado ao SHA do build, encontra a divergencia; [CI #44277074937](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44277074937) **SUCCESS**, `MEG_STAGE10_APK708_BRIDGE_ACCEPTED_CONFIRMED_MISMATCH=DETECTED`.
2. Inspecao do binario de release por hash controlado e 15 assets Web: [CI push #44277262354](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44277262354) **SUCCESS**. Literais `PHOENIX_WRITE_NOT_CONFIRMED`, `/finance/events`, `/finance/benefit-events`, `/cards/purchases` localizados dentro do APK. Isso demonstra presenca de strings no pacote, **nao a execucao do ramo em aparelho**.
3. [CI PR #44277271866](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44277271866) SUCCESS, incluindo regressao financeira PG17 e TypeScript. Teste [CI #44194162073](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44194162073) ja prova idempotencia do POST /finance/events com mesmo operationId em QA.
4. Nenhum teste Android offline/falha de rede em dispositivo real realizado, nem DML no banco real.

## Decisao operacional provisoria

Nao assumir que erro visual signifique que o lancamento nao foi gravado: conferir primeiro na fonte canônica `FinancialEvent` por ID e operationId. Nao reexecutar operacao financeira ambigua com novo operationId antes de verificar seu estado.

A correção da interpretação `accepted/confirmed` exige mudança da camada **cliente Phoenix** e homologacao em ambiente de QA. Como o Android 708 permanece congelado, nao publicar nova APK ou OTA sem decisao expressa sobre essa excecao. Nao modificar respostas da API para criar confirmacao falsa.

## Bloqueio

Issue [#699](https://github.com/MarcosVilalva/MEG-Platform/issues/699) continua P0. Testes seguintes: sucesso aceito com leitura ainda pendente; resposta HTTP perdida apos commit; 409 por revisao e rejeicao financeira permanente; reenvio e reinicio do app. Dados ficticios e API/banco QA isolados. #691 impede deploy produtivo e #700 impede saneamento arbitrario de categorias/metodos.

**Indicador:** 5/10 = 50% tecnico e 0% de saneamento produtivo.
