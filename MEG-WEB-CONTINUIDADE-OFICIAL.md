# MEG Web Evolution | Checkpoint operacional vigente

> **Registro curto atualizado em 01/11/2026.** Este quadro substitui os STATUS antigos do diário de continuidade, mas **não apaga as decisões históricas**. Sempre verificar GitHub e Render antes de trabalhar: o estado pode ter mudado após esta data.
>
> Histórico integral preservado em:
> - [Checkpoint da `main` até a reorganização](docs/historico/MEG-WEB-CONTINUIDADE-MAIN-ATE-2026-11-01.md)
> - [Checkpoint mais completo da branch Home 06](docs/historico/MEG-WEB-CONTINUIDADE-HOME06-ATE-2026-11-01.md)
>
> Processo: [Protocolo de continuidade](docs/MEG-WEB-PROTOCOLO-DE-CONTINUIDADE.md). Índice de agente: [AGENTS.md](AGENTS.md).

## 1. Identidade e ordem de decisão

- Projeto: **MEG Finanças Web Evolution**; repositório: `MarcosVilalva/MEG-Platform`.
- **Regra soberana:** negócio do repositório → print oficial atual → Prompt Master → checkpoint. Documentos antigos só servem à recuperação histórica e a regras ainda válidas, não definem visual vigente.
- Referências: [autoridade financeira canônica](docs/MEG-WEB-FINANCIAL-AUTHORITY.md), [catálogo das imagens oficiais](docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md) e imagens oficiais atuais do Projeto; Prompt Master fornecido pelo Projeto.
- Do PDF de Regras Consolidadas, apenas regras de negócio dos itens **7–16, 18–19 e 21–22**; a decisão posterior exclui **Crediário**. **Autocomplete e Alimentação** (Benefício + Verocard + Pago) são obrigatórios.
- Cada chat atua **somente na etapa autorizada**; não reiniciar pela Etapa 01 nem avançar por conta própria.

## 2. Estado verificado no GitHub

| Controle | Estado conferido |
|---|---|
| **Etapa autorizada** | **06 – Home**, em implementação/validação; **não homologada** |
| Branch da Home | `meg-web-evolution/06-home-reinicio-20261030` |
| PR da Home | [#651](https://github.com/MarcosVilalva/MEG-Platform/pull/651), **Draft, aberta, sem merge** |
| HEAD da PR #651 | `ddc250d9b05f832636016a44ac5f14c260683905` (registro documental; **UI baseline** permanece `25b167f`) |
| Base da PR #651 | `meg-web-evolution/07-revisao-visual-loading-20261027` |
| Gate Home Panorama | **SUCCESS** no run [#41132153131](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41132153131): nove resoluções, build Web/API, evidência de screenshots |
| Gate Foundation geral | **FAILURE** no run [#41132153200](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41132153200); falhas de regressão/toolbar no DataGrid compartilhado exigem investigação na etapa adequada |
| DataGrid | PR [#606](https://github.com/MarcosVilalva/MEG-Platform/pull/606) **merged**, não alterar para resolver falha estética isolada da Home |
| Telas de autenticação | PR [#649](https://github.com/MarcosVilalva/MEG-Platform/pull/649) **Draft**; não inferir merge ou funcionamento E2E pelo aceite visual |

**Aceites visuais já registrados no histórico:** Loading, Login e Criar Conta, e Recuperar Senha **nas revisões específicas apresentadas e aprovadas pelo usuário em 27–28/10/2026**. Isso não homologa integração real de autenticação nem versões alteradas posteriormente. A **Home 06 recebeu PRÉ-CONFIRMAÇÃO visual parcial em 01/11/2026** do código `25b167f`, com feedback de que melhorou bastante; **não recebeu homologação final**, autorização de merge nem conclusão funcional. A [PR #653](https://github.com/MarcosVilalva/MEG-Platform/pull/653) mantém novo refino visual em branch isolada.

## 3. Render e validação visual

- Serviço da Home: `meg-home-06-panorama-clean`; branch de deploy automático: `meg-web-evolution/06-home-reinicio-20261030`.
- **Última conferência em 01/11/2026:** a versão de código **`25b167f38c9a302cf83ba079227ab7887fb6870a` está `live`** no serviço isolado da Home (deploy `dep-dbjksoijnfac738a56dg`). O limite mensal do Render foi renovado e a versão preconfirmada está publicada. **Não afirmar que o refino experimental da PR #653 esteja publicado**.
- Objetivo do usuário: **manter deploy automático**, com filtros de caminhos por serviço. A integração Render usada na auditoria apenas lê esses filtros; a aplicação nos serviços existentes **ainda não foi confirmada**.
- Sempre fornecer link com cache-busting somente após verificar SHA realmente publicado. Captura ou CI verde não substitui homologação visual.

## 4. Limites protegidos e decisões permanentes

- `android/**` e `apps/web/src/mobile/**`: **congelados/somente leitura**. Não alterar Android, OTA, dependências ou UI móvel legada.
- Nova Web isolada: **não reaproveitar UI/CSS antigos**. Proteger Shell, componentes base, DataGrid e telas já aprovadas.
- Regras financeiras exclusivamente canônicas: `financial-policy.ts`, `monetary-protection.ts`, `opening-balance.ts`, `read-model.ts`, writers `event-mutation.ts`/`benefit-event-mutation.ts` e demais autoridades declaradas na [autoridade financeira](docs/MEG-WEB-FINANCIAL-AUTHORITY.md). Nenhuma tela recalcula saldo, valor de fatura, parcela, baixa, benefício, limite ou status.
- Visual somente pelos prints oficiais do Projeto. Simetria entre telas, marca MEG destacada, responsividade mobile-first; breakpoints principais **640/1024px**. Zero scroll horizontal/cortes/sobreposições; não acumular CSS remendado.
- Nenhuma PR visual sofre merge até gates pertinentes verdes **e** aceite visual explícito, quando exigido. Não confundir autorização de execução com aprovação do resultado.

## 5. Próximo passo permitido e pendências reais

**Continuar somente Home 06**, mantendo as PRs #651 e #653 Draft. Preservar o baseline `25b167f` pré-confirmado e publicado no Render. Revisar captura comparativa do refino isolado da PR #653 contra os prints oficiais, acompanhar Foundation sem modificar DataGrid nesta etapa e **não substituir a publicação preconfirmada sem nova decisão visual**. A próxima tela (**Lançamentos**) **não está autorizada neste checkpoint**.

Pendências verificadas:
1. Home com **pré-confirmação parcial**, sem homologação final; baseline `25b167f` já publicado e preservado. Refinos posteriores ficam isolados na PR #653, dependentes de captura comparativa e aceite.
2. Foundation geral com falhas, sem liberação para merge; não mascarar falhas com baselines alterados.
3. Filtros de build do Render ainda não aplicados aos serviços ativos; consumo e publicação devem ser reconferidos.
4. Governança desta revisão deve ser revisada em PR **separada**, sem avançar telas, mexer na API ou causar deploy desnecessário.

**Governança documental separada:** [PR #652](https://github.com/MarcosVilalva/MEG-Platform/pull/652), branch `docs/meg-governanca-continuidade-20261101`, base `main`, **Draft e sem merge**. Este resumo novo ainda precisa ser sincronizado com a PR #651 após aprovação da governança; não substituir por diário antigo.

## 6. Modelo para o próximo checkpoint

Atualizar **este quadro**, substituindo os valores desatualizados, sem acrescentar diários contínuos. Registrar: data da verificação; etapa; tela; branch/PR/SHA; CI; Render/live; aceites explícitos; arquivos tocados; divergências; pendências e próxima ação. Detalhes históricos vão a `docs/historico/` em registros versionados, não ao topo operativo.
