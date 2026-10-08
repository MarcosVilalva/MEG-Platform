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

- abaixo de 640px: cards e bottom sheet de filtros em tela cheia;
- 640px a 1023px: cards e bottom sheet acessível;
- a partir de 1024px: tabela completa, header sticky, popovers e rolagem interna.

Não existe nova opção na sidebar. O Shell da Etapa 03 permanece intacto.

## Autoridade financeira e dados

A Etapa 04 preserva `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` e `docs/MEG-WEB-DATA-SOURCE.md`.

O DataGrid pode selecionar, filtrar, agrupar, contar e agregar campos normalizados para fins de apresentação. Não pode reconstruir saldo, competência, fatura, limite, parcelamento, baixa, saldo pós-operação ou política de status.

O harness não duplica dados oficiais. Sua fixture é técnica e existe somente para exercitar tipos, escala, acessibilidade e responsividade.

## Gate

O workflow `MEG Web Evolution Foundation` mantém todos os contratos da Etapa 03 e acrescenta:

1. contrato puro do DataGrid;
2. contrato estrutural/clean-room;
3. contrato de navegador para 1920x1080, 1366x768, 1366x600, 1024x768, 900x700, 640x600 e 390x844, com cobertura adicional dos popovers em 1024x600, 1093x480 e 910x400, sidebar expandida e recolhida, clique fora, Esc, foco, contenção, ações e evidências visuais.

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
- Em 910x400, a grade usa tabela compacta em paisagem baixa para preservar cabeçalho sticky inteiro e pelo menos duas linhas visíveis.
