#!/usr/bin/env node
// Gate estrutural específico do seletor visual da PR #648.
// Não acessa banco, não cria eventos, não instala dependências.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const source = path => readFileSync(new URL(path, root), 'utf8');
const picker = source('apps/web/src/meg-web-evolution/launches/LaunchTypePicker.tsx');
const css = source('apps/web/src/meg-web-evolution/launches/launch-type-picker.css');
const form = source('apps/web/src/meg-web-evolution/launches/NewLaunchForm.tsx');
const installer = source('scripts/meg-pr648-instalar-imagens-reais.mjs');

for (const id of ['expense', 'income', 'transfer', 'benefit']) {
  assert.match(picker, new RegExp("id: '" + id + "'"),
    'O seletor deve manter a opção ' + id);
}
assert.match(picker, /id: 'expense'[\s\S]*?enabled: true/);
assert.match(picker, /id: 'income'[\s\S]*?enabled: true/);
assert.match(picker, /id: 'transfer'[\s\S]*?enabled: false/);
assert.match(picker, /id: 'benefit'[\s\S]*?enabled: false/);
assert.match(picker, /disabled=\{!option\.enabled\}/,
  'Fluxos não liberados precisam ser realmente desabilitados.');
assert.match(picker, /onChoose\(option\.id\)/,
  'Ações habilitadas devem abrir o formulário existente.');
assert.match(form, /<LaunchTypePicker onChoose=\{chooseType\}/,
  'A seleção deve reutilizar o fluxo existente.');
assert.match(form, /basicLaunchInput\(fields, accounts, categories, methods\)/,
  'Validação funcional deve permanecer centralizada no contrato existente.');
assert.match(form, /financeClient\.createEvent\(/,
  'O writer financeiro protegido não pode ser substituído pela UI.');
assert.match(picker, /meg-choice__hero-photo/);
assert.match(picker, /meg-choice__option-photo/);
assert.doesNotMatch(picker, /<svg|<HeroArt|<OptionArt|<LaunchVisualIcon/,
  'O seletor nao deve desenhar cenas ou icones SVG.');
for (const img of ['hero','expense','income','transfer','benefit']) {
  assert.match(css, new RegExp('meg-assets/' + img + '\\\\.webp'),
    'Imagem WebP ausente do layout: ' + img);
}
assert.match(installer, /MEG_PR648_IMAGENS_REAIS\.zip/);
assert.match(css, /\.meg-new-launch\.is-choose[\s\S]*?overflow:\s*hidden/);
assert.match(css, /\.meg-choice__options[\s\S]*?grid-template-rows:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
assert.match(css, /@media \(max-width: 639px\)/);
assert.doesNotMatch(picker, /fetch\(|axios\.|localStorage\.|createEvent\(/,
  'O seletor não pode acessar dados ou gravar movimentações.');
console.log('PR #648: seletor com imagens reais preserva fluxos e contratos financeiros (gate estático OK).');
