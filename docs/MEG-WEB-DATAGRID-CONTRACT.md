# MEG Web Evolution - Contrato do DataGrid

## Escopo

Este documento fixa a arquitetura da Etapa 04. O DataGrid é infraestrutura genérica da nova Web. Ele não é uma tela de Lançamentos e não conhece saldo, fatura, parcela, competência, limite, baixa ou regra de status.

Base da etapa: `main@6307387efd5a1b5322b0ff89ca6656be799aeb72`.

## API pública

```ts
DataGrid({
  data,
  columns,
  pageSize,
  groupBy,
  selectable,
  footerAggregates,
  onFilterChange,
  persistenceKey,
  rowKey,
  loading,
  ariaLabel,
})
```

Contrato de coluna:

```ts
{
  key,
  label,
  type: 'text' | 'number' | 'currency' | 'date' | 'enum' | 'boolean',
  width,
  minWidth,
  sortable,
  filterable,
  render,
  aggregate: 'sum' | 'count' | 'avg',
}
```

`persistenceKey` separa o estado de cada instância/tela. `rowKey` define a chave estável da linha quando o campo `id` não for suficiente.

## Organização

- `types.ts`: contratos públicos e estado previsível.
- `core.ts`: motor puro de filtro, ordenação, agrupamento, agregação genérica, paginação, virtualização, CSV e persistência.
- `FilterPanel.tsx`: filtros por tipo e valores distintos.
- `DataGrid.tsx`: composição React, acessibilidade, seleção, colunas, desktop/mobile e interação.
- `datagrid.css`: camada visual própria usando os tokens aprovados da Etapa 03.
- `harness-fixture.ts`: fixture exclusivamente técnica.
- `harness-main.tsx` + `datagrid-harness.html`: preview isolado sem item na sidebar.
- `datagrid.contract.test.ts`: contrato funcional do motor puro.
- `datagrid.structure.contract.test.mjs`: contrato estático/clean-room.
- `datagrid.viewport.browser.test.mjs`: contrato real de navegador nos viewports obrigatórios.

## Filtros

O estado exposto por `onFilterChange` contém:

```ts
{
  filters,
  activeKeys,
  filteredCount,
}
```

A lógica é AND entre colunas e OR entre valores selecionados da mesma coluna. Para montar os valores distintos de uma coluna, o motor aplica todos os outros filtros e exclui temporariamente o filtro da própria coluna, garantindo cascata.

Atalhos de data são resolvidos em runtime com `new Date()`. Nenhuma data relativa fica gravada em mock, HTML ou componente.

Filtros e seletor de colunas usam popover compacto ancorado ao gatilho em qualquer altura de viewport. A largura segue `clamp(280px, 24vw, 360px)`, limitada por `calc(100vw - 16px)`; a altura é automática, com `max-height: min(560px, calc(100dvh - 16px))`. O posicionamento recalcula flip/shift/clamp em resize e scroll, abre para cima quando necessário e evita sobrepor a sidebar quando o gatilho está na área principal. Se o gatilho sair da viewport, o popover fecha.

Cabeçalho e rodapé permanecem visíveis; somente o corpo rola, com overscroll contido, scrollbar estável e indicação visual de continuidade. Não existe fallback para bottom sheet por baixa altura. TEXT, NUMBER, CURRENCY, DATE, ENUM e BOOLEAN seguem a mesma regra. O filtro TEXT mantém sua lista de valores distintos de forma intencional, além do operador livre: isso faz parte do contrato Excel/Power BI da Etapa 04, e não transforma a coluna em ENUM.

## Ordenação

Cada coluna percorre três estados: crescente, decrescente e sem ordenação. Shift+clique preserva as regras anteriores e acrescenta a nova coluna, formando multi-sort estável.

## Seleção

A seleção usa `rowKey`/ID estável e nunca o índice visual. "Selecionar todos" atua somente no conjunto filtrado. Filtrar ou paginar não remove uma seleção válida; a seleção só é podada quando a entidade deixa de existir no `data` recebido.

## Colunas

Larguras respeitam `minWidth`. O desktop oferece resize por ponteiro e teclado, drag-and-drop para reordenação e menu "Colunas" com mostrar/ocultar e reordenação acessível por botões.

## Agrupamento e agregados

`groupBy` é estritamente estrutural. Grupos são recolhíveis e expõem a quantidade total do grupo no conjunto filtrado. Quando um grupo atravessa páginas, o cabeçalho informa também quantos itens daquele grupo estão na página atual; paginação nunca altera o total canônico do grupo.

A ordem dos grupos segue a primeira ocorrência de cada grupo no conjunto já filtrado e ordenado. Sem ordenação ativa, isso preserva a ordem da fonte recebida; com ordenação, a sequência dos grupos acompanha o primeiro aparecimento no resultado ordenado. Um mesmo grupo pode reaparecer em páginas posteriores quando cruza o limite de paginação.

Os subtotais de grupo usam o grupo completo do conjunto filtrado, não apenas o recorte da página. `sum`, `count` e `avg` continuam sendo estritamente genéricos e só aparecem quando configurados na coluna. O harness da Etapa 04 configura `sum` em moeda e `avg` em número; não configura `count` redundante nas colunas text/boolean porque o próprio cabeçalho já fornece a contagem do grupo.

Esses agregados operam somente sobre valores já recebidos pelo componente. Eles não substituem nenhum total cuja definição pertença à camada financeira.

## Paginação e virtualização

A paginação é aplicada sobre o conjunto filtrado e ordenado. Acima de 500 entradas visíveis na página atual, o DataGrid virtualiza a janela de renderização com overscan.

O harness usa 640 linhas técnicas e `pageSize=600` para manter o caminho de virtualização permanentemente coberto pelo gate.

## CSV

A exportação usa somente dados filtrados e ordenados, colunas visíveis e UTF-8 com BOM. Valores de moeda são serializados com duas casas decimais e separador decimal brasileiro, sem arredondamento destrutivo de centavos.

## Persistência

Chave física:

`meg-web-evolution:datagrid:<persistenceKey>`

São persistidos filtros, sort, ordem, visibilidade, larguras e pageSize. A sanitização descarta chaves de coluna inexistentes, evitando estado obsoleto ou colisão entre instâncias.

## Responsividade

Somente os breakpoints estruturais aprovados:

- abaixo de 640px: cards e filtro móvel acessível;
- 640px a 899px: cards em qualquer altura;
- 900px a 1023px: cards por padrão; exceção explícita apenas quando a altura for <=500px, usando tabela compacta;
- a partir de 1024px: tabela completa, header sticky, popovers e rolagem interna.

A exceção numérica de paisagem baixa é, portanto, `min-width: 900px` + `max-width: 1023px` + `max-height: 500px`. Assim, `910x400` permanece tabela; `680x400` e `680x600` permanecem cards.

Não existe nova opção na sidebar. O Shell da Etapa 03 permanece intacto.

## Autoridade financeira e dados

A Etapa 04 preserva `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` e `docs/MEG-WEB-DATA-SOURCE.md`.

O DataGrid pode selecionar, filtrar, agrupar, contar e agregar campos normalizados para fins de apresentação. Não pode reconstruir saldo, competência, fatura, limite, parcelamento, baixa, saldo pós-operação ou política de status.

O harness não duplica dados oficiais. Sua fixture é técnica e existe somente para exercitar tipos, escala, acessibilidade e responsividade.

## Gate

O workflow `MEG Web Evolution Foundation` mantém todos os contratos da Etapa 03 e acrescenta:

1. contrato puro do DataGrid;
2. contrato estrutural/clean-room;
3. contrato de navegador para 1920x1080, 1366x768, 1366x600, 1024x768, 910x400, 900x700, 680x600, 680x400, 640x600 e 390x844, com cobertura adicional dos popovers em 1024x600 e 1093x480, sidebar expandida e recolhida, clique fora, Esc, foco, contenção, ações e evidências visuais.

A validação técnica não substitui a validação visual explícita.


### Correção visual — popovers compactos
- Cabeçalho limitado a aproximadamente 44px e fechamento compacto.
- Busca + “Selecionar tudo (N)” ficam em bloco opaco fora da rolagem dos valores.
- Em filtros de valores, somente a lista rola; a árvore de datas é a única região rolável do filtro DATE.
- O select de operador usa altura aproximada de 36px, com texto integral.
- Listas de valores preservam pelo menos três linhas úteis em viewports baixos quando houver itens.
- O cabeçalho sticky da tabela usa fundo totalmente opaco para impedir conteúdo fantasma.
- Em altura até 640px, toolbar e espaçamentos verticais são compactados sem alterar altura das linhas ou paginação.


### Ajustes finais — filtros ativos e DATE
- “Filtros ativos” permanece em faixa própria acima da área rolável.
- Select móvel “Coluna” segue o mesmo tema escuro de “Operador”.
- Anos do filtro DATE iniciam recolhidos, usam aria-expanded e indicador +/−.
- Evidências aguardam conteúdo real antes da captura.


### Complemento final — filtros ativos na toolbar
- Filtros ativos ficam na mesma linha da toolbar, sem faixa estrutural adicional.
- A toolbar mostra no máximo dois chips e usa “+N filtros” para abrir um popover com todos os chips e “Limpar tudo”.
- O botão móvel mostra “Filtros (N)”.
- Resumo de filtro DATE usa dd/mm/aaaa; intervalos iguais mostram uma única data.
- Em 910x400, a grade usa a exceção de tabela compacta de paisagem baixa (`>=900px` e `<=500px` de altura) para preservar cabeçalho sticky inteiro e pelo menos duas linhas visíveis.


### Complemento 2 — alturas baixas e vazio filtrado
- Em 1366x600 e 910x400, shell/harness, toolbar, grupos, agregados e paginação usam compactação vertical para preservar cabeçalho e pelo menos duas linhas de dados visíveis.
- A área da tabela mantém rolagem interna.
- “Filtros (N)” permanece visível em todas as larguras, inclusive com N=0.
- O estado vazio causado por filtros preserva o modo responsivo vigente: tabela + cabeçalho/funis nos modos tabela; mensagem no corpo em modo cards, sem forçar tabela.
- O contrato browser cobre 0, 1, 3 e 5 filtros nas duas viewports e o estado vazio filtrado.


### Correção passo 7 — operador nos chips de filtros ativos
- Chips de filtros baseados em operador exibem o operador junto do valor, tanto na toolbar quanto no popover de “Filtros ativos”.
- NUMBER/CURRENCY usam os símbolos =, ≠, >, ≥, < e ≤; “Entre” mantém o rótulo explícito.
- DATE exibe o operador por extenso (“Está entre”, “É igual a”, “Antes de”, “Depois de”) e mantém datas em dd/mm/aaaa.
- TEXT também preserva o operador (“Contém”, “Não contém”, “Começa com”, “Termina com”, “É igual a”).
- Chips compactos da toolbar podem truncar visualmente com reticências para preservar a linha única; o atributo title mantém o texto completo.
- Chips dentro do popover “Filtros ativos” não truncam: mostram o texto inteiro com quebra de linha quando necessário, mantendo também title com o texto completo.


### Passo 7 — refinamento do popover e tooltips
- O popover “Filtros ativos” usa linhas de lista em largura total, com raio de 8px, nome da coluna em destaque, resumo integral abaixo e botão de remoção em coluna própria.
- O popover não usa pílulas e não aplica ellipsis ao resumo.
- “Filtros (N)” possui tooltip com a quantidade de filtros ativos.
- “+N filtros” possui tooltip com todos os filtros ocultos, incluindo coluna e resumo completo do operador/valor.
- Chips compactos da toolbar mantêm resumo visual curto, mas o tooltip expande valores selecionados; até cinco valores são mostrados e excedentes usam “+N”.
- Tooltips abrem tanto em hover quanto em foco por teclado.
- Cobertura Playwright dedicada valida tooltips e geometria das linhas em 1366x600 e 910x400 usando Chrome do runner, sem nova dependência persistida no projeto.


### Passo 7 — posicionamento dos tooltips da toolbar
- Tooltips de `Filtros (N)`, `+N filtros` e chips da toolbar são centralizados pelo centro real do gatilho usando a largura renderizada do próprio tooltip.
- A geometria é medida antes da exibição para eliminar o deslocamento causado por largura shrink-to-fit.
- O tooltip respeita margem mínima de 8px da viewport; quando o centro ideal ultrapassa a viewport, somente o clamp necessário é aplicado.
- A preferência vertical é abaixo do gatilho com gap de 8px; quando não houver espaço, abre acima; fallback permanece inteiramente dentro da viewport.
- Playwright valida hover e foco por teclado em 1366x600 e 910x400, exigindo diferença de centros <= 8px quando não houver clamp e confinamento integral à viewport.


### Passo 7 — rodapé no estado vazio filtrado
- Quando filtros zeram o conjunto, o corpo mantém cabeçalho e mensagem “Nenhum resultado com os filtros atuais”, mas o rodapé de paginação permanece renderizado como irmão fixo da área rolável.
- O estado vazio usa intervalo `0–0 de 0`, indicador `1 / 1` e botões anterior/próxima desabilitados.
- O seletor “Mostrar” continua funcional mesmo com zero resultados.
- A mensagem vazia fica contida no corpo flexível e não cria rolagem da página nem overflow interno desnecessário.
- Playwright valida o estado com `Valor técnico ≥ 999999` em 1366x600 e 910x400.


### Passo 7 — correção responsiva 680px e diagnóstico de contrato
- Foi confirmada uma inconsistência histórica do contrato: a regra geral dizia `640–1023px = cards`, enquanto o complemento posterior exigia `910x400 = tabela`. A resolução adotada mantém cards como regra e torna `910x400` uma exceção numérica estreita: `900–1023px` com altura `<=500px`.
- Diagnóstico anterior à correção em `680x600` com resultado filtrado vazio confirmou `tableDisplay: table`. A regra responsável era global, fora de media query: `.meg-datagrid-filtered-empty .meg-datagrid-table { display: table; }`. Essa regra ignorava o breakpoint responsivo e foi removida; o display passa a ser decidido exclusivamente pelos modos tabela autorizados.
- Em `640–899px`, a toolbar de cards usa composição própria para evitar sobreposição entre “Filtros (N)”, seleção, ordenação, filtros ativos e ações.
- Matriz obrigatória desta correção: `1366x600`, `910x400`, `680x600`, `680x400`, `640x600` e `390x844`.
- Auditoria em `910x400` antes da correção encontrou três campos visíveis sem `id/name`: busca do Shell, checkbox “Selecionar todos os itens filtrados” da tabela e seletor “Mostrar” do DataGrid. O Shell não é alterado nesta rodada. Os controles do DataGrid recebem `name`; os equivalentes móveis/linhas também recebem `name` para evitar o mesmo aviso em outros estados.


### Fechamento técnico da Etapa 04 — qualidade responsiva e regressão
- O breakpoint excepcional de tabela compacta continua restrito a `min-width: 900px`, `max-width: 1023px` e `max-height: 500px`. Em 680x600 e 680x400 o modo obrigatório é cards.
- A cobertura Playwright mantém 680x400 como critério de aceite da toolbar: chips, `+N filtros` e `Limpar tudo` precisam permanecer integralmente dentro da toolbar.
- `Limpar tudo` limpa somente os filtros. A ordenação vigente é preservada, tanto em tabela quanto em cards; página volta para zero e viewport é resetado.
- Campos pertencentes ao DataGrid e ao `FilterPanel` devem possuir `id` ou `name`. A busca da topbar pertence ao Shell da Etapa 03 e não é alterada nesta etapa.
- O gate de navegador passa a verificar console warnings/errors, page errors e DevTools Issues próprios do DataGrid. O único `FormLabelForNameError` conhecido do campo de busca do Shell é registrado, não atribuído ao DataGrid.
- Acessibilidade automatizada usa `@axe-core/playwright@4.13.0` na matriz aprovada: 1366x600, 910x400, 680x600, 680x400, 640x600 e 390x844.
- Regressão visual usa `toHaveScreenshot` com fixture determinística e baseline versionado para a mesma matriz. Evidência avulsa de screenshot não substitui essa comparação.
