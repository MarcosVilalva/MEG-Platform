# MEG Web Evolution | Home 06 | Piloto Taste Skill

**Data:** 29/10/2026. **Status:** experimento de auditoria, **não** aprovação visual nem implantação de uma nova Home.

## Autoridade e isolamento

- PR autorizada: **#650**, Draft, sem merge. Android congelado. Nenhuma alteração permitida na autenticação 01–04 aprovada.
- Fonte soberana da composição: `docs/MEG-WEB-HOME-REFERENCIA-VISUAL-OFICIAL-02-20261028.md` e PNG `MEG_HOME_REFERENCIA_VISUAL_02_20261028.png` no Projeto, identificado por SHA-256 `f5159708960a2b85321cd67be6f0d746459d9df68761dadfacb3682f0e7b6665`.
- Regras financeiras e contratos do repositório têm prioridade máxima. React não calcula saldos, faturas, benefícios, pagamento ou status. A prévia estática usa **valores fictícios explicitamente identificados**.
- A versão compactada sem rolagem foi rejeitada. É permitida rolagem vertical natural com **zero rolagem horizontal da página** e **zero conteúdos cortados**.
- A ferramenta externa serve como **auditoria**, não como gerador de um novo padrão. Rejeitar qualquer sugestão que altere identidade MEG, tokens oficiais, ordem funcional dos blocos ou reintroduza promoções/percentuais não respaldados.

## Ferramenta e método revisados

- Origem: `Leonxlnx/taste-skill`, skill atual `design-taste-frontend`, versão identificada no commit `12af471f627f866411b4bd785b19646d3672784c` (24/10/2026).
- O nome antigo `redesign-existing-projects` está descontinuado. Para uma Home financeira usa-se o capítulo `references/app-screens.md` e o modo `--app`.
- Rodar **somente no runner isolado**, com repositório externo fixado por SHA e permissões `contents: read`. O CLI da ferramenta não tem acesso ao banco do MEG, a tokens de produção nem a credenciais. Não incorporar dependências, CSS ou componentes de terceiros ao produto.
- O checker Taste é **diagnóstico**. Não substituir os gates financeiros, Playwright local nem a avaliação visual do usuário. Resultados automáticos podem gerar falsos positivos por conflito com as artes oficiais (por exemplo, foto e iluminação escura da Home).

## Inventário da Home existente e prioridades verificáveis

| Área | Autoridade de dados | Referência da imagem 02 | Lacuna observada na captura da revisão anterior | Prioridade |
| --- | --- | --- | --- | --- |
| Saldo monetário | `homeOverview.available` vindo da rota canônica | Carteira real e saldo predominante | Cena atual não tem o mesmo enquadramento/profundidade e perde presença em 1366 px | Alta |
| Fluxo mensal | `summary` + `cashflow` da API | Entradas, saídas, resultado coerente | Bloco correto, mas com muito espaço sem informação em relação à referência | Média |
| KPIs | `homeOverview`, `summary` | Quatro indicadores alinhados | Rótulos e descrições longos quebram de forma desigual | Alta |
| Benefícios | `benefit-summary` | Saldo próprio, créditos, utilizado, cartão real | Cartão aparece isolado e a composição não se aproxima da foto oficial | Alta |
| Ações rápidas | navegação existente | Cinco controles simétricos | Alvos repetidos, mas textos quebram/ocupam alturas diferentes em algumas larguras | Alta |
| Últimas movimentações | contratos + DataGrid original | Linhas e colunas legíveis, ícones semânticos | Alguns cabeçalhos abreviam e células de descrição truncam cedo | Alta |
| Próximos vencimentos | `/payables/open` + DataGrid original | Mesmo grid das movimentações | Coluna Conta usa travessão quando dado não existe; não inventar conta | Média |
| Shell | Shell Web existente | Logo MEG e sidebar coerentes | Cabeçalho atual difere do print 02, mas está fora do primeiro recorte para evitar alterações colaterais | Pendente de avaliação |

**Pergunta principal da Home:** quanto há disponível agora, qual é o saldo do benefício e o que preciso pagar ou revisar em seguida?

**Ação principal de trabalho:** acesso funcional a lançamentos e pendências, respeitando a disponibilidade real de cada rota.

## Procedimento de teste

1. Registrar baseline do commit da PR e capturas de 1366, 768 e 390 px.
2. Rodar `lint.mjs --app` apenas nos arquivos visuais da Home e `inspect.mjs --app` na prévia estática já existente.
3. Confrontar os achados com a imagem oficial, explicando exceções quando o guia Taste conflitar com o padrão soberano MEG.
4. Corrigir por **impacto visual**: (i) hierarquia e alinhamento, (ii) enquadramento de imagens sem número rasterizado, (iii) composição dos KPIs/Verocard, (iv) DataGrid, (v) controles. Uma etapa por vez.
5. Repetir inspeção e screenshots; só entregar preview após Render publicar o SHA exato, junto com link sem cache.

### Gates que não podem ser relativizados

- Testes de caracterização financeira, build da API e Web, isolamento e Android intocado.
- Nenhuma redução de tamanho com corte ou `overflow:hidden` para esconder defeitos.
- DataGrid preservado, com conteúdo acessível e sem larguras negativas.
- **Aprovação visual explícita do usuário** antes de qualquer merge.

## Resultado desta rodada

O piloto de auditoria está registrado em código e será executado no GitHub Actions, sem incorporar o Taste Skill ao runtime do MEG. **Nenhum redesign do produto foi aprovado por esse registro.** Os relatórios de execução ficam em `artifacts/home-06/taste` (artefato GitHub Actions).

## Primeira execução medida | 29/10/2026

**Execução GitHub Actions:** `40916502984`. Teste externo `design-taste-frontend` em modo `--app`, versão fixada `12af471f627f866411b4bd785b19646d3672784c`.

- O job experimental foi concluído tecnicamente, com artefato `meg-home-06-taste-diagnostic` contendo `lint.json`, `inspect/report.json` e imagens desktop/tablet/mobile.
- O inspector analisou 1366 × 854, 768 × 1024 e 390 px. **Encontrou 6 FAIL e 2 WARN**. Esses são diagnósticos de projeto genérico, **não** status dos gates oficiais MEG.
- FAIL: `gradient`, `text-shadow`, `button-fx`, `icon-chips`, `tiny-text`, `no-title`.
- WARN: `dev-server` e `heavy-borders`.
- `gradient` e `icon-chips`: existem no print oficial 02, inclusive nos cards e atalhos. **Exceção justificada:** não eliminá-los cegamente.
- `no-title`: adicionado `h1` semanticamente acessível, visualmente oculto para não criar um cabeçalho extra que descaracterize o print.
- `heavy-borders` e `text-shadow`: o CSS da Home foi refinado reduzindo contraste das bordas e removendo sombra decorativa do valor do saldo. Não altera números ou componentes financeiros.
- `tiny-text`: o inspector apontou especificamente `XLS` e `PDF` em 7px. Isso precisa ser confirmado no estado de ferramentas do DataGrid antes de mudar componente global; **pendente**.
- `dev-server`: era um servidor Vite de diagnóstico. O gate de produção da Web continua separado.
- **Limitação:** o inspector reporta a altura do documento, mas a Home rola dentro de `.meg-main`; portanto, sua captura inicial não garante inspeção dos DataGrids abaixo da dobra. Os testes Playwright específicos do MEG continuam obrigatórios.

**Próxima comparação:** executar novamente a auditoria depois dos ajustes e confrontar screenshot desktop/mobile com a referência 02. O objetivo é diminuir ruído visual sem reduzir hierarquia e densidade financeira. O aceite permanece exclusivamente do usuário.
