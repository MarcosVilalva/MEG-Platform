# MEG Web Evolution — Etapa 10 | Editar Lançamento: prontidão e bloqueios

Data: 12/11/2026. Escopo exclusivo da Etapa 10. Status: **prévia QA isolada, sem homologação visual do Editar e SEM writer habilitado**.

## Fontes verificadas

1. `MEG-WEB-CONTINUIDADE-OFICIAL.md` na branch `stage08/unified-qa-stage05-08-10-20261112`.
2. `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, autoridade financeira canônica.
3. `docs/MEG-WEB-STAGE10-AUDITORIA-20261112.md` e `scripts/meg-stage10-write-contract-characterization.test.ts`, PR #675 Draft, **apenas regra/risco**, não padrão visual.
4. `apps/api/src/modules/finance/service.ts` (`updateFinancialEvent`), `financial-policy.ts`, `event-mutation.ts`, serviços de cartões/benefícios e `read-model.ts`.
5. Nova Despesa visualmente homologada da PR #678, incorporada à PR #688 Draft, com layout MEG Prism 2.0; seletor fotográfico aprovado em `89522ed5364383341be3bb99e0597ec99264855a`.

## Matriz de prontidão antes de editar dados reais

| Origem/domínio | Autoridade | Situação de edição |
| --- | --- | --- |
| `FinancialEvent` monetário genérico | `finance/service.ts:updateFinancialEvent` | **Bloqueado** até caracterizar transação, versão/idempotência, saldo e reclassificação de status. PATCH atual não oferece a mesma proteção da criação. |
| Compra com cartão, parcelas/fatura | `cards/service.ts`, `cards/routes.ts`, `card-statement-canonical.ts` | **Bloqueado** na prévia. Edição unitária não implica autorização de lote ou alteração de parcela paga/parcial. |
| Conta Benefício / Alimentação / Verocard | `benefit-event-mutation.ts` | **Bloqueado** na prévia. Não migrar para conta monetária, cartão de crédito ou writer genérico. |
| Pendência com baixa parcial/total | `payables/service.ts` | **Bloqueado** até teste transacional e origem de status. |
| Evento vinculado a domínio/recibo | Guarda `FINANCIAL_EVENT_LINKED_DOMAIN` | **Bloqueado** para edição genérica, não mascarar o vínculo. |
| Arquivamento/exclusão | `finance/routes.ts` + `finance/service.ts` | **Bloqueado**; depende de papéis, vínculos e confirmação. |

## Prévia de Editar Despesa

- Novo componente `apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx`, CSS **exclusivo da edição** `EditExpensePreview.css`. Importa a folha existente `ExpenseForm.css` para manter a **mesma composição de três colunas da Nova Despesa aprovada**. Não modifica `ExpenseForm.tsx` nem seus estilos.
- Snapshot demonstrativo `QA_EDIT_EXPENSE_SNAPSHOT` explicitamente `source: financial-event`, `financialScope: monetary`, `type: expense`. As informações financeiras (valor, status, conta, categoria, data e método) são **somente leitura do registro fictício**, sem cálculos de saldo/status/fatura no navegador.
- Descrição e Observações podem ser digitadas em memória, com normalização de texto livre em MAIÚSCULAS. **Não são gravadas** e não representam permissão operacional já concedida pelo backend.
- Botão `Salvar alterações` permanentemente desabilitado. Nenhum `onSave`, `fetch`, POST, PATCH, DELETE, mutação ou integração financeira. Não há exclusão, confirmação de pagamento nem movimentação de cartão/benefício.
- Acesso **somente no preview QA unificado** via `meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar`. Não modifica ações da tabela homologada, nem introduz edição na aplicação real.
- A prévia **não está homologada visualmente**. Aprovações da Nova Despesa e do seletor continuam preservadas sem transferência automática de aceite ao Editar.

## Gates antes de converter prévia em funcionalidade real

1. Identificação autoritativa da origem e do tipo do registro no read-model, sem inferência por texto.
2. Testes de caracterização em PostgreSQL **descartável** para edição genérica, saldo, concorrência, versão/idempotência, rollback e efeito no ledger.
3. Testes específicos de cartões, parcelas, vencimentos, fatura, estornos e benefícios; edição unitária ou em massa somente por autoridade própria.
4. Contratos de autocomplete com IDs canônicos; proibição de copiar valor/data automaticamente; histórico legado sem ID deve permanecer sem vínculo automático.
5. Status, competência, fatura, total, saldo e rateios sempre produzidos pela camada financeira canônica, nunca pela tela.
6. Permissões/roles e vínculos em edição/arquivamento; política de Alimentação `Conta Benefício + Verocard + Pago` preservada.
7. CI técnico verde, Playwright responsivo e **homologação visual explícita**, em seguida autorização separada para integração de writes. Nenhum deploy produtivo ou merge no momento.

## Restrições

Preservar Android congelado, API, banco real, produção, Home, Lançamentos, Shell, DataGrid, Loading, Login, Cadastro, Recuperação, Nova Despesa e seletor fotográfico Prism homologados. Reutilizar QA rotativa `meg-stage08-alerta-prism-pr685`; não criar novos serviços Render, não excluir ambientes históricos sem auditoria/autorização. PR #688 permanece Draft.

**Próximo passo:** concluir CI isolado, publicar no mesmo Render QA somente após verde, disponibilizar link sem cache de `modal=editar` e solicitar homologação visual da nova prévia. Continuar contratos transacionais antes de habilitar edição real.

## Revisão autorizada de Editar Despesa (13/11/2026, horário de Brasília)

**Esta seção substitui apenas a descrição da prévia visual anterior; os bloqueios financeiros e a matriz de autoridade acima permanecem vigentes.**

- O responsável aprovou usar o **mesmo formulário completo de Nova Despesa** para edição, pré-preenchido a partir do registro, com botão `Salvar alterações` ativado somente quando há alteração válida. Ao desfazer todas as alterações, o botão volta a desabilitar. Campo obrigatório inválido não autoriza salvar.
- **Desistência:** no modo Editar, o X fecha o formulário e descarta todas as alterações em memória, sem gravar. O botão Voltar não aparece nessa modalidade. Escape permanece uma ação de fechamento.
- A implementação reutiliza `ExpenseForm.tsx` com `mode='edit'`, `initialDraft`, verificação de mudança por comparação com o estado original e o mesmo layout de 3 colunas, campos, máscaras, autocomplete, atalhos, informações de pagamento e responsividade da Nova Despesa homologada. O modo `create` mantém sua interface e seus contratos.
- `EditExpensePreview.tsx` agora é somente um adaptador do snapshot fictício para esse formulário. Não existem PATCH, POST, DELETE ou conexão financeira. Na QA, `onSimulatedSave` somente informa que nenhuma alteração foi gravada, embora o botão fique habilitado em estado modificado e válido.
- Arquivos alterados: `apps/web/src/meg-web-evolution/stage10/ExpenseForm.tsx`, `apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx`, `apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx`, `scripts/meg-stage08-unified-qa.browser.mjs`.
- CI integrado em Chrome **SUCCESS**, execução [#43548251683](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251683), no commit `a60a68b8d4d6e14015b9257cc073aa771b4342f2`. Coberturas: campos pré-preenchidos, salvar inicialmente desabilitado, alteração válida, reversão, validação obrigatória, edição local fictícia, X e reabertura sem persistência, mobile fullscreen e layout desktop.
- Verificação pública [#43548251725](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251725) **FAILURE antes de publicar o novo código**, porque o Render ainda serve a prévia anterior, cujo formulário não possui os campos da edição unificada. Não caracterizar essa falha como regressão do build local.
- Hospedagem QA: branch `stage08/overdue-prism-warning-20261112` avançada com fast-forward e lease, de `108f499932cf284fa679605db29fe8b7e47d8c17` para `a60a68b8d4d6e14015b9257cc073aa771b4342f2`; nenhum merge em main.
- **PENDÊNCIA BLOQUEANTE:** Render `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`) tem Auto Deploy OFF. O disparo manual exigiu confirmação do workspace; a lista retornou `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`). **Não disparar deploy até confirmação explícita desse workspace pelo responsável.** Depois, implantar no mesmo serviço, checar LIVE no commit correto e reexecutar smoke público.
- A nova versão **ainda não está publicada nem visualmente homologada**. Os testes aprovados não são aprovação visual. Writer real, exclusão, cartões, parcelamento e atualização de saldo permanecem bloqueados por seus contratos transacionais.

## Publicação da revisão com formulário compartilhado (14/11/2026)

A pendência de workspace descrita na seção anterior **foi resolvida** por autorização explícita do responsável ("ok") para `My Workspace`, `tea-d98k1qhkh4rs73f4sfj0`.

- Render QA rotativo existente: `srv-dbr00b56e07s738n62n0`, Auto Deploy OFF.
- Deploy manual com limpeza de cache `dep-dbrsr03rjlhs73cfql1g` **LIVE** em `a60a68b8d4d6e14015b9257cc073aa771b4342f2`.
- Gate integrado [#43548251683](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251683) **SUCCESS**.
- Gate público [#43548251725](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43548251725), job reexecutado `132306637114`, **SUCCESS**, com 13 perfis de viewport comprovados nos logs.
- URL sem cache: https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar&v=a60a68b8d4d6e14015b9257cc073aa771b4342f2
- **Aguardando aprovação visual específica da nova versão.** Nenhum clique da QA grava alterações. Writer real, PATCH, DELETE, merge, produção, API, banco, Android e novos serviços Render continuam não autorizados.

O novo teste público passou somente após o novo deploy, em reexecução. A falha inicial do teste público refletia a publicação anterior, não aprovação financeira ou regressão da nova versão.


## Etapa 10 — Homologação de Editar Despesa e ações da grade em QA (14/11/2026)

- **Aceite humano do Editar Despesa:** responsável declarou na conversa “tela de editar está validado”. A versão compartilhada de Editar Despesa em `a60a68b8d4d6e14015b9257cc073aa771b4342f2` está HOMOLOGADA VISUALMENTE. A aprovação não autoriza gravação real.
- **Decisão de produto aprovada:** substituir o olho por lápis nas despesas monetárias elegíveis, manter Ver detalhes, acrescentar menu de ações com Duplicar, Histórico, Confirmar pagamento e Arquivar, e botão `Editar em lote` no cabeçalho. O responsável confirmou “CONCORDO COM TUDO, ESTA VALIDADO TODAS AS AÇÕES, PODE SEGUIR”. Isso aprova a proposta funcional, não representa inspeção visual da interface nova após deploy.
- **Implementação somente na QA unificada:** opt-in `qaActions` em `LaunchesStage09.tsx`. Fora da QA, cabeçalho e ação original de consulta são mantidos sem redesenho. Despesa monetária da fixture pode abrir o editor com dados do registro selecionado; benefício, receita e outros domínios continuam em consulta. Duplicação cria rascunho local, sem valor/data reaproveitados ou gravação. Histórico de auditoria, baixa e arquivamento apenas informam seus bloqueios, sem simular persistência.
- **Edição em lote:** o `DataGrid` expõe seleção por callback opt-in (IDs selecionados e IDs filtrados); nenhuma seleção paralela. Botão com contador inicia desabilitado; modal mostra todos os registros selecionados, inclusive de páginas/filtros distintos; observações e categoria são apenas campos de simulação. Classificação sem catálogo canônico, valores, contas, status, cartão, fatura, parcelas, competência, pagamento e arquivamento ficam bloqueados.
- **Arquivos de código alterados:** `apps/web/src/meg-web-evolution/datagrid/{types.ts,DataGrid.tsx}`, `apps/web/src/meg-web-evolution/launches/{LaunchesStage09.tsx,launches-stage09.css}`, `apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx`, `apps/web/src/meg-web-evolution/stage10/{LaunchActionsQa.tsx,LaunchActionsQa.css}`, `scripts/meg-stage08-unified-qa.browser.mjs`.
- **Commit técnico publicado:** `4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068`, PR #688 Draft, branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`, branch QA `stage08/overdue-prism-warning-20261112` avançada por fast-forward com lease, sem merge na main. Comparação demonstrou 16 commits à frente de `a60a68b8`, zero atrás. Nenhuma PR aberta com base na branch de hospedagem.
- **Gates comprovados:** CI integrado [#43552931162](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552931162) **SUCCESS**; Chrome público [#43552931151](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43552931151), reexecução do job `132320188234` **SUCCESS** após Render LIVE. Logs confirmam `MEG_STAGE10_QA_ACTIONS` em 390, 640, 960, 1024 e 1366 px e regressão anterior `MEG_UNIFIED_PRISM`, `MEG_PRISM_COMPACT_LANDSCAPE` e `MEG_EDIT_PRISM_WIDE` com PASS em 13 perfis.
- **Render QA:** mesmo serviço rotativo `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), Auto Deploy OFF; novo deploy manual com cache limpo `dep-dbrti68n74is7388fd80` **LIVE** no código `4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068`. Nenhum novo serviço criado.
- **Link sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068
- **Segurança preservada:** nenhuma chamada API real na QA; sem PATCH, DELETE, pagamentos, writers, saldo recalculado na UI, banco real, Android, produção, merge ou avanço para Etapa 11. Regras de Alimentação, Verocard, parcelas, competência, benefício, estorno e edição financeira permanecem sob a autoridade canônica.
- **PENDÊNCIA VISUAL:** a nova barra de ações, menus por linha e modal Editar em lote ainda não receberam homologação visual explícita APÓS esta publicação. A homologação anterior da tela Editar Despesa continua válida e não é transferida automaticamente às novas ações.
- **Próximo passo exato:** responsável validar visualmente as ações na URL sem cache (desktop e Poco C75 vertical/paisagem). Após ajustes e aceite específicos, caracterizar contratos transacionais de edição individual/coletiva e avançar um item por vez nos demais pendentes da Etapa 10, incluindo Nova Receita. Não ativar writers sem autorização separada.

Esta seção supersede as observações históricas de “aguardando aprovação visual” do Editor Despesa; os bloqueios financeiros continuam vigentes.


## Etapa 10 — Menu único de Ações (ícone lista + seta) na QA (14/11/2026)

- **Autorização de interface:** após enviar como referência o ícone compacto de lista com pequena seta, o responsável declarou “bora seguir assim entao”. Essa aprovação autoriza a mudança proposta, mas **não** homologa visualmente a versão publicada; a inspeção continua pendente.
- **Escopo:** somente coluna Ações do `LaunchesStage09` no fluxo opt-in `qaActions` da QA unificada (PR #688 Draft). Duas ações inline (lápis e reticências) foram substituídas por **um único botão lista + seta**, no padrão Prism 2.0. Menu mantém seis opções com `Editar lançamento` em primeiro lugar, seguido de Ver detalhes, Duplicar como rascunho, Histórico, Confirmar pagamento e Arquivar. Coluna QA reduzida para 78px (mínimo 72px). Fora da QA, o fluxo legado de consulta permanece intacto.
- **Comportamento:** trigger `aria-haspopup="menu"`, `aria-expanded`, foco no primeiro item, navegação por setas/Home/End, fechamento por Escape/clique externo/ação. Modal/menu restrito à viewport, com toque ≥44px no mobile. Evitado fechamento involuntário decorrente do scroll/foco do DataGrid. Menus financeiros continuam protegidos: nenhuma simulação de write para histórico canônico, baixa e arquivamento. `Editar em lote` e a seleção nativa DataGrid permanecem preservados.
- **Arquivos técnicos modificados:** `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.tsx`, `LaunchActionsQa.css`, `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`, `scripts/meg-stage08-unified-qa.browser.mjs`. Nenhum arquivo da Home, Android, API ou banco alterado.
- **Commit técnico publicado:** `040bf15f3929961a2e7063c68a8ac62a4a69bc80`, branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`; hospedagem `stage08/overdue-prism-warning-20261112` avançada de `4914f53a3cec7eb7e2530b87ebab1b0d0a5ca068` por fast-forward sem força, após conferir 6 commits à frente e zero atrás e ausência de PRs dependentes.
- **CI integrado:** https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582214610 **SUCCESS**. **QA pública pós-deploy:** https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582214591 **SUCCESS na reexecução** (job `132410000979`). Evidências `MEG_STAGE10_QA_ACTIONS` PASS em 390, 640, 960, 1024 e 1366px; regressão Prism em 820×360, 1024×450, 1366×768, 1920×1080, 1920×1200; Editor wide em 1440×900, 1920×1080, 1920×1200. O teste público falhou antes de publicar o novo código, mas passou após LIVE.
- **Render QA:** workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), mesmo serviço `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF. Deploy manual cache limpo `dep-dbs2tkec6qcc73a1r3d0` **LIVE** no SHA exato `040bf15f3929961a2e7063c68a8ac62a4a69bc80`. Sem serviço novo.
- **Link sem cache para inspeção:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=040bf15f3929961a2e7063c68a8ac62a4a69bc80
- **Gate legado divergente já preexistente:** workflow `MEG Stage09 - Web integrada Home + Lancamentos isolada` executado na branch hospedagem falhou em https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582396712, ao comparar `HomeDashboard.tsx` com hash `9ccb041...`, quando o blob atual já era `781412...`. A MESMA falha constava na execução anterior https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43553150519, antes desta alteração. Não alterar hashes/guards nem declarar todos os gates verdes. A reconciliação do workflow está pendente de revisão escopada e aprovação. Gate da QA Stage08 de hospedagem https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43582396713 **SUCCESS**.
- **Limites preservados:** PR #688 Draft; sem merge na main, writer PATCH/DELETE, dados ou API real, produção, Android, Etapa 11, mudança de qualquer tela homologada ou novo serviço Render. Editor Despesa já homologado visualmente permanece intocado. Edição financeira em lote real e Nova Receita continuam pendentes da Etapa 10.
- **Próximo passo:** usuário inspecionar a interface de Ações e seu menu no link LIVE (desktop, mobile vertical e Poco C75 horizontal). Registrar aceite visual apenas mediante manifestação explícita. Não ativar mutações financeiras.


## Etapa 10 — Micro-refino do botão Ações Prism 2.0 (14/11/2026)

- **Autorização:** usuário enviou captura do botão Ações e observou que a seta estava colada às linhas. Após proposta de refinamento pontual, autorizou expressamente: `pode seguir`. Isso autoriza implementar/publicar a QA, mas não é homologação visual do resultado.
- **Escopo efetivo:** somente botão único Ações da QA unificada da Etapa 10. Ícone de linhas e seta passaram a ser dois SVGs semânticos internos ao mesmo botão, separados por `gap: .5rem` (aprox. 8px), centralizados e com caret menor/discreto. Botão desktop `3.15rem × 2.65rem`, mobile até 639px `3.15rem × 2.75rem`, sem corte e com alvos adequados. Identidade e estados MEG Prism preservados. Nenhuma mudança em menu, seis opções, edição em lote, DataGrid, formulário homologado, regras financeiras ou fluxo fora da QA.
- **Arquivos técnicos modificados:** `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.tsx`, `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.css`, `scripts/meg-stage08-unified-qa.browser.mjs`. Comparação com último checkpoint confirma SOMENTE esses 3 arquivos. Os testes medem espaçamento real de pelo menos 6px, centralização de até 2px, contorno interno e altura do alvo, mantendo testes de navegação e ausência de writes.
- **Commit técnico QA:** `fba0511a2cbc81721fdcc92f9e40fa508da42a61`. PR #688 permanece Draft e sem merge. Branch de desenvolvimento `stage08/unified-qa-stage05-08-10-20261112`; hospedagem `stage08/overdue-prism-warning-20261112` avançada por fast-forward sem força, de `040bf15f3929961a2e7063c68a8ac62a4a69bc80` ao SHA técnico, sem commits divergentes nem PRs dependentes.
- **Gates positivos:** CI integrado https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585122288 **SUCCESS**. Smoke público depois do deploy https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585122318 **SUCCESS** na reexecução, job `132418667630`. Logs `MEG_STAGE10_QA_ACTIONS` PASS em 390, 640, 960, 1024 e 1366 px; testes prévios de Prism em 820×360, 1024×450, 1366×768, 1920×1080 e 1920×1200, além do editor wide em 1440×900, 1920×1080 e 1920×1200, também PASS. QA hospedagem Stage08 https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585304664 **SUCCESS**.
- **Gate legado ainda vermelho (pré-existente):** Stage09 https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43585304766 falha em hash obsoleto de `HomeDashboard.tsx`: esperado `9ccb041d72088db1f071bad2c82965c564f73743`, atual `781412cfeef4b72a7a95de0766c94fd17c1de239`. Mesma falha já registrada anteriormente, fora dos três arquivos desta revisão. NÃO desativar nem adulterar este controle sem revisão e autorização; não declarar todos os gates verdes.
- **Render QA:** workspace autorizado `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`), mesmo serviço `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), Auto Deploy OFF. Deploy manual com limpeza de cache `dep-dbs3eqifngtc73bk4fsg` confirmado **LIVE** no commit exato `fba0511a2cbc81721fdcc92f9e40fa508da42a61`. Nenhum novo serviço.
- **Prévia sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=fba0511a2cbc81721fdcc92f9e40fa508da42a61
- **Aprovações/pêndencias:** Editar Despesa compartilhado já homologado visualmente anteriormente e intocado. Visual do novo micro-refino do botão Ações ainda **NÃO HOMOLOGADO** pelo responsável; CI e deploy não substituem inspeção. A integração real da edição, lote financeiro, atualização, exclusão e Nova Receita permanecem bloqueadas/pendentes na Etapa 10.
- **Restrições:** sem PATCH/DELETE, writer financeiro real, API ou banco de produção, Android, merge na main, deploy produtivo, novas instâncias Render ou avanço à Etapa 11.
- **Próximo passo exato:** responsável inspecionar botão Ações atualizado, alinhamento e menu na URL sem cache, no desktop e celular (incluindo paisagem). Registrar homologação apenas se explícita, ou corrigir pontualmente a QA conforme observação.

## Etapa 10 — Homologação visual do micro-refino de Ações (14/11/2026)

- **Aprovação explícita do responsável:** após receber o link QA do botão refinado, declarou `validado, qual a proxima etapa`. Fica **HOMOLOGADO VISUALMENTE** exclusivamente o micro-refino do botão Ações em MEG Prism 2.0 (espaçamento entre lista e seta, proporção, alinhamento), entregue no commit técnico `fba0511a2cbc81721fdcc92f9e40fa508da42a61`. Não extrapolar para homologação visual do modal Editar em lote nem dos outros fluxos não vistoriados.
- **Evidências preservadas:** Render QA `dep-dbs3eqifngtc73bk4fsg` LIVE no SHA acima; CI integrada `43585122288` SUCCESS e teste público após publicação `43585122318` SUCCESS na reexecução. PR #688 permanece Draft, sem merge. Nenhuma edição financeira real autorizada.
- **Etapa autorizada permanece 10. Próximo passo exato:** conferir visualmente, em QA, o menu de ações e sobretudo o modal Editar em lote (seleção e contagem, campos opt-in, proteção de campos financeiros, cancelar, preview e responsividade). Após aceite visual específico, continuar pela caracterização de contratos transacionais de edição individual/coletiva e respectivos testes isolados, sem writer produtivo. Nova Receita permanece item subsequente da Etapa 10. Etapa 11 não autorizada.
- **Bloqueios inalterados:** workflow legado Stage09 ainda vermelho por hash antigo da Home; não adulterar gate. Sem PATCH/DELETE, banco/API/Android/produção, novos serviços Render, merge ou deploy produtivo.
