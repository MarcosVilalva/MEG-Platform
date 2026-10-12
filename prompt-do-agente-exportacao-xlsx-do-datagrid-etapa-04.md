# Etapa 04: exportação XLSX do DataGrid

**Escopo:** só `apps/web/src/meg-web-evolution/datagrid/`. Não mexer no Android, em outras telas, rotas nem baselines. **Não** disparar CI, **não** fazer commit nem push. Não usar `stash`, `reset`, `checkout` nem `clean`: preservar o WIP.

**Dependência:** `exceljs@4.4.0` já está instalado e o lockfile já foi atualizado. **NÃO rode `npm install` nem `npm ci`.** Não alterar `package.json` nem `package-lock.json`.

**Fatos já confirmados (não repetir a investigação):**
- `parsePtBrNumber` existe em `./core`: `'3.25'` vira 3.25, `'1,25'` vira 1.25, `'1.234,56'` vira 1234.56.
- `"type": "module"` nos dois `package.json`, então `await` no topo do teste é aceito.
- `apps/web/tsconfig.json`: `target ES2020`, `module ESNext`, `moduleResolution Bundler`, `esModuleInterop` true, `include: ["src", ...]`. O `tsc -b` checa os `*.test.ts` em modo `strict`.
- O runner é `test:web-evolution-datagrid` (três arquivos `tsx`/`node` em sequência; o último é `datagrid.stage05.contract.test.ts`).

## 0. Antes de tudo

```bash
pwd && git status --short && git branch --show-current && git rev-parse HEAD
```

Hoje só `apps/web/package.json` e `package-lock.json` aparecem modificados. Informar o resultado.

## 1. Criar os 3 arquivos anexos

Criar em `apps/web/src/meg-web-evolution/datagrid/`, sem sobrescrever nada divergente:
- `datagrid-export-header.ts`
- `datagrid-xlsx.ts`
- `datagrid-xlsx.contract.test.ts`

**Logo depois, antes de mexer em `DataGrid.tsx`:**

```bash
npx tsc -b apps/web --pretty false
```

Corrigir erros de tipo só nos arquivos novos (no teste, ajustar `Row`/`columns` se preciso). Informar a saída.

## 2. Correções em `datagrid-xlsx.ts` e no teste

a. **Nome do arquivo:** `'datagrid-tecnico_' + stamp.file + '.xlsx'` (formato `datagrid-tecnico_AAAA-MM-DD_HHmm.xlsx`). No teste, o assert passa a ser `datagrid-tecnico_2026-10-12_1400.xlsx` (17:00Z = 14:00 em São Paulo). Atualizar o tipo/retorno se necessário.

b. **Faixa de totais:** pintar (fundo teal e fonte branca em negrito) **todas** as colunas de 1 até `max(right, labelColumn)`, e não só as células com valor. Substituir o `row.eachCell` por um loop que preenche cada coluna.

c. **`nativeNumber`:** remover da regex a segunda alternativa (milhar sem vírgula). Fica aceita apenas: `^-?\d+(?:[.,]\d+)?$` e o caso com vírgula decimal e milhares, se já coberto por `parsePtBrNumber`. Valores como `1.234.567` ficam como **texto**, nunca como número errado. Se ficar dúvida, conferir `'1.234,56'` com `parsePtBrNumber` e manter o teste coerente.

d. Manter: `NUMBER_FORMAT = '#,##0.00'`, uma linha de total por modo (`Soma`, `Média`, `Contagem`), `count` no formato `0` (nunca R$), proteção contra fórmula (`=`, `+`, `-`, `@` ficam como texto com `numFmt '@'`), `ySplit: 9` com linhas de metadado compactas e logo opcional com fallback em texto.

e. Confirmar que `sortedRows` entrega número nos campos `number`/`currency`. Se vier string, `nativeNumber` converte; **não recalcular nem arredondar** o valor.

## 3. `datagrid-pdf.ts`

Importar `officialLogo`, `exportPeriodLabel`, `exportFilterLabels` e `timeInSaoPaulo` de `datagrid-export-header.ts`, removendo as cópias locais. **O PDF não pode mudar de aparência.** O nome do arquivo PDF permanece o atual.

## 4. `DataGrid.tsx` (toolbar de exportação, ~1542-1550)

- Trocar `exportCsv` por `exportXlsx`, com `import('./datagrid-xlsx')` dinâmico e `saveDataGridXlsx`. O `exceljs` também é carregado via `import()`; normalizar `Workbook` ou `default.Workbook`.
- Usar `visibleColumns`, `sortedRows`, `aggregateCells(filteredRows)`, `activeFilterItems`, `exportPeriod` e `exportUserName`, exatamente como o PDF.
- Mesmo estado de ocupado e erro do PDF, com `aria-busy` e `disabled`.
- Botões só com ícone SVG, distintos para Excel e PDF, com `aria-label` e `title` (`Exportar Excel` / `Exportar PDF`). Durante a geração, `aria-label="Gerando ..."`.
- **A toolbar aprovada NÃO pode crescer** em 910×400 e 1366×600. Meça no navegador (`getBoundingClientRect`). Se 44px alterar o layout, manter a altura visual atual (`2.15rem`) e ampliar só a área de toque (pseudo-elemento), sem overflow nem sobreposição em 360×844, 390×844, 910×400 e 1366×600.

## 5. Testes

- Atualizar os testes que dependem dos textos "CSV"/"PDF" dos botões (por exemplo, no Playwright usar o nome acessível `Exportar PDF`).
- Encadear `datagrid-xlsx.contract.test.ts` no `datagrid.stage05.contract.test.ts` (mesmo runner do `test:web-evolution-datagrid`), sem mexer no script do `package.json`.
- Ajustar os asserts às correções 2a, 2b e 2c.

## 6. Validação

```bash
npx tsc -b apps/web --pretty false
npm run test:web-evolution-datagrid
npm --workspace apps/web run build
npx playwright test apps/web/src/meg-web-evolution/datagrid/datagrid.stage05.playwright.spec.mjs apps/web/src/meg-web-evolution/datagrid/datagrid.stage05.comparison.playwright.spec.mjs apps/web/src/meg-web-evolution/datagrid/datagrid.quality.playwright.spec.mjs --workers=1
```

- O build deve mostrar um chunk `datagrid-xlsx` e um do `exceljs`, **fora do bundle inicial**.
- Rodar também acessibilidade e comparação visual.
- Se houver diferença visual, **parar, mostrar o diff e pedir aprovação**. Nunca usar `--update-snapshots` sem autorização.
- Não relaxar nem remover nenhum teste existente. Se algum precisar mudar, justificar.

## 7. Entrega

- Lista de arquivos alterados e `git status --short` final.
- Saída de `tsc`, dos testes e do build (trecho com `xlsx|exceljs|error`).
- Medidas de altura da toolbar e dos botões, `scrollWidth/clientWidth` e sobreposição em 360×844, 390×844, 910×400 e 1366×600.
- Prints em 360×844, 390×844 e desktop, com e sem filtros.
- **Transparência:** informar o que foi e o que não foi executado. Não afirmar nada como verde sem ter rodado.