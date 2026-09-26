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
const paymentIndex = launch.indexOf("label={mode === 'income' ? 'Forma de recebimento' : 'Forma de pagamento'}");
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

assert.ok(
  launch.includes("if (!categoryId) return 'Selecione a categoria.';")
  && launch.includes("if (!paymentMethodId) return mode === 'income' ? 'Selecione a forma de recebimento.' : 'Selecione a forma de pagamento.';"),
  'Categoria e forma devem ser validadas explicitamente antes de salvar.',
);

assert.ok(
  picker.includes('className="meg5-picker-list" data-meg-scroll-region="true"'),
  'Seletor MEG deve rolar somente a lista interna.',
);
assert.ok(
  pickerCss.includes('.meg5-picker-overlay{')
  && pickerCss.includes('position:fixed;')
  && pickerCss.includes('.meg5-picker-sheet{')
  && pickerCss.includes('overflow:hidden;'),
  'Seletor MEG deve ficar contido no viewport.',
);

assert.ok(
  movements.includes("[category, account].filter(Boolean).join(' · ')"),
  'Card de lançamento deve preservar categoria e conta como contexto do registro.',
);
assert.ok(movements.includes('meg3-payment-chip'), 'Forma de pagamento deve ter chip visual próprio no card.');
for (const token of ["['all','Todos']", "['income','Receitas']", "['expense','Despesas']", "['benefit','Alimentação']"]) {
  assert.ok(movements.includes(token), 'Aba de filtro ausente: ' + token);
}
assert.ok(!movements.includes('meg3-event-date-group'), 'Lista não deve depender de agrupamento estrutural para representar os registros.');
assert.ok(
  movements.includes('className="meg3-event-list" data-meg-scroll-region="true"'),
  'Somente a lista de lançamentos deve rolar.',
);
assert.ok(
  movementCss.includes('.meg3-payment-chip{') && movementCss.includes('border-radius:999px'),
  'Forma de pagamento deve permanecer visualmente separada em chip.',
);
assert.ok(
  launchCss.includes('.meg3-form-grid-faithful{grid-template-columns:1fr}'),
  'Formulário mobile principal deve usar fluxo vertical fiel à prévia.',
);

console.log('Contrato de fidelidade de Lançamentos mobile validado.');