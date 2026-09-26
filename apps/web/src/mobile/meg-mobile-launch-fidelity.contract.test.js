import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const launch = readFileSync(new URL('./MegMobileLaunchSheet.tsx', import.meta.url), 'utf8');
const picker = readFileSync(new URL('./MegMobilePicker.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./MegMobileCoreScreens.tsx', import.meta.url), 'utf8');
const launchCss = readFileSync(new URL('./meg-mobile-launch-sheet.css', import.meta.url), 'utf8');
const pickerCss = readFileSync(new URL('./meg-mobile-picker.css', import.meta.url), 'utf8');
const movementCss = readFileSync(new URL('./meg-mobile-core-screens.css', import.meta.url), 'utf8');

assert.doesNotMatch(launch, /<select\\b/i, 'Novo/Editar lançamento não pode voltar a usar select nativo do Android.');

for (const token of ['label="Categoria"', 'Forma de pagamento', 'label="Conta"', 'label="Cartão"', 'meg3-amount-field']) {
  assert.ok(launch.includes(token), 'Campo obrigatório ausente do contrato mobile: ' + token);
}

const descriptionIndex = launch.indexOf('>Descrição</span>');
const categoryIndex = launch.indexOf('label="Categoria"');
const paymentIndex = launch.indexOf('Forma de pagamento');
const accountIndex = launch.indexOf('label="Conta"');
const amountIndex = launch.indexOf('meg3-amount-field');
const dateIndex = launch.indexOf('Vencimento');
assert.ok(
  descriptionIndex >= 0 && descriptionIndex < categoryIndex
  && categoryIndex < paymentIndex
  && paymentIndex < accountIndex
  && accountIndex < amountIndex
  && amountIndex < dateIndex,
  'Ordem do formulário deve seguir Descrição → Categoria → Forma → Conta → Valor → Data/Vencimento.',
);

assert.match(
  launch,
  /if \\(!categoryId\\) return 'Selecione a categoria\\.';[\\s\\S]*if \\(!paymentMethodId\\)/,
  'Categoria e forma devem ser validadas explicitamente antes de salvar.',
);

assert.match(picker, /className="meg5-picker-list" data-meg-scroll-region="true"/, 'Seletor MEG deve rolar somente a lista interna.');
assert.match(
  pickerCss,
  /\\.meg5-picker-overlay\\{[\\s\\S]*position:fixed[\\s\\S]*\\.meg5-picker-sheet\\{[\\s\\S]*overflow:hidden/,
  'Seletor MEG deve ficar contido no viewport.',
);

assert.match(
  movements,
  /\\[category, account\\]\\.filter\\(Boolean\\)\\.join\\(' · '\\)/,
  'Card de lançamento deve preservar categoria e conta como contexto do registro.',
);
assert.match(movements, /meg3-payment-chip/, 'Forma de pagamento deve ter chip visual próprio no card.');
assert.match(
  movements,
  /\\['all','Todos'\\][\\s\\S]*\\['income','Receitas'\\][\\s\\S]*\\['expense','Despesas'\\][\\s\\S]*\\['benefit','Alimentação'\\]/,
  'Abas são filtros Todos / Receitas / Despesas / Alimentação.',
);
assert.doesNotMatch(movements, /meg3-event-date-group/, 'Lista não deve depender de agrupamento estrutural para representar os registros.');
assert.match(movements, /className="meg3-event-list" data-meg-scroll-region="true"/, 'Somente a lista de lançamentos deve rolar.');
assert.match(movementCss, /\\.meg3-payment-chip\\{[\\s\\S]*border-radius:999px/, 'Forma de pagamento deve permanecer visualmente separada em chip.');
assert.match(launchCss, /meg3-form-grid-faithful[\\s\\S]*grid-template-columns:1fr/, 'Formulário mobile principal deve usar fluxo vertical fiel à prévia.');

console.log('Contrato de fidelidade de Lançamentos mobile validado.');