import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const launch = readFileSync(new URL('./MegMobileLaunchSheet.tsx', import.meta.url), 'utf8');
const picker = readFileSync(new URL('./MegMobilePicker.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./MegMobileCoreScreens.tsx', import.meta.url), 'utf8');
const launchCss = readFileSync(new URL('./meg-mobile-launch-sheet.css', import.meta.url), 'utf8');
const pickerCss = readFileSync(new URL('./meg-mobile-picker.css', import.meta.url), 'utf8');
const movementCss = readFileSync(new URL('./meg-mobile-core-screens.css', import.meta.url), 'utf8');
const history = readFileSync(new URL('./meg-mobile-description-history.ts', import.meta.url), 'utf8');

assert.doesNotMatch(launch, /<select\\b/i, 'Novo/Editar lançamento não pode voltar a usar select nativo do Android.');

for (const token of ['Classificação / categoria *', 'Forma de pagamento', 'Conta de origem *', 'label="Cartão"', 'meg3-amount-field']) {
  assert.ok(launch.includes(token), 'Campo obrigatório ausente do contrato mobile: ' + token);
}

const descriptionIndex = launch.indexOf('>Descrição</span>');
const paymentTypeIndex = launch.indexOf('Tipo de pagamento *');
const categoryIndex = launch.indexOf('Classificação / categoria *');
const accountIndex = launch.indexOf('Conta de origem *');
const amountIndex = launch.indexOf('meg3-amount-field');
assert.ok(
  descriptionIndex >= 0 && descriptionIndex < paymentTypeIndex
  && paymentTypeIndex < categoryIndex
  && categoryIndex < accountIndex
  && accountIndex < amountIndex,
  'O formulário deve preservar Descrição, Tipo de pagamento, Classificação, Conta de origem e Valor.',
);
assert.ok(
  launchCss.includes('.meg3-form-sheet--new-expense .meg3-amount-field{order:2')
  && launchCss.includes('.meg3-app-header')
  && launchCss.includes('.meg3-app-dock'),
  'Novo lançamento deve apresentar Valor/Data após Descrição dentro do quadro completo do app.',
);
assert.ok(
  launch.includes('<div className="meg3-app-header">{appHeader}</div>')
  && launch.includes('<div className="meg3-app-dock">{appDock}</div>')
  && !launch.includes("!event && mode === 'expense' ? <div className=\"meg3-app-header\"")
  && !launch.includes("!event && mode === 'expense' ? <div className=\"meg3-app-dock\""),
  'Novo, Editar, Receita e Alimentação devem compartilhar o mesmo shell completo do app.',
);
assert.ok(
  launch.includes("data-editor={event ? 'true' : 'false'}")
  && launchCss.includes('.meg3-form-sheet--new-expense[data-editor="true"] .meg3-form-actions'),
  'Editar lançamento deve manter ações fixas e lado a lado dentro do shell mobile.',
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
assert.ok(movements.includes('meg3-payment-label'), 'Forma de pagamento deve permanecer visível no card conforme a referência oficial.');
for (const token of ["['all','Todos','sliders']", "['income','Receitas','arrow-up']", "['expense','Despesas','arrow-down']"]) {
  assert.ok(movements.includes(token), 'Filtro de status/tipo ausente: ' + token);
}
for (const token of ['Todas as categorias', 'Todas as contas', 'Todas as formas']) {
  assert.ok(movements.includes(token), 'Filtro detalhado ausente: ' + token);
}
assert.ok(
  movements.includes('meg3-movement-filter-overlay')
  && movements.includes('Filtrar lançamentos')
  && movements.includes('Limpar')
  && movements.includes('Aplicar'),
  'Filtros de Lançamentos devem continuar acessíveis sem ocupar a composição principal aprovada.',
);
assert.ok(!movements.includes('meg3-event-date-group'), 'Lista não deve depender de agrupamento estrutural para representar os registros.');
assert.ok(
  movements.includes('className="meg3-event-list" data-meg-scroll-region="true"'),
  'Somente a lista de lançamentos deve rolar.',
);
assert.ok(
  movements.includes('className="meg3-movement-kpis"')
  && movements.includes('money.format(totals.income)')
  && movements.includes('money.format(totals.expense)')
  && movements.includes('meg3-movement-list-head'),
  'Lançamentos deve preservar Entradas, Saídas, Resultado e contagem da referência aprovada.',
);
assert.ok(
  !movements.includes('onClick={onNew}')
  && !movements.includes('weekdayShort(event)'),
  'Tela de Lançamentos não deve duplicar a ação Novo nem exibir dia da semana nos cards.',
);
assert.ok(
  movementCss.includes('.meg3-payment-label{'),
  'Forma de pagamento deve permanecer visível em linha própria no card, sem voltar a sumir da lista.',
);
assert.ok(
  launchCss.includes('.meg3-form-grid-faithful{grid-template-columns:1fr}'),
  'Formulário mobile principal deve usar fluxo vertical fiel à prévia.',
);

console.log('Contrato de fidelidade de Lançamentos mobile validado.');

assert.ok(
  launch.includes('loadMegMobileHistorySuggestions')
  && launch.includes('Digite para pesquisar no seu histórico')
  && launch.includes('useHistorySuggestion')
  && launch.includes("setCategoryId(category.id)")
  && launch.includes("setPaymentMethodId(method.id)")
  && launch.includes("setAccountId(account.id)"),
  'Lançar Despesa deve pesquisar o histórico e restaurar categoria, forma e conta ao reutilizar uma descrição.'
);
assert.ok(
  history.includes('loadPhoenixAllEvents')
  && history.includes('occurrences')
  && history.includes('lastDate')
  && history.includes('item.normalized.startsWith(query)'),
  'Autocomplete mobile deve usar o histórico financeiro completo com relevância, frequência e recência.'
);
assert.ok(
  launchCss.includes('.meg3-history-suggestions{')
  && launchCss.includes('.meg3-history-status{'),
  'Autocomplete de descrição deve permanecer dentro da identidade visual clean-room.'
);


assert.ok(
  launch.includes("if (mode !== 'benefit') return;")
  && launch.includes("setAccountId(benefitAccount?.id || '')")
  && launch.includes("setPaymentMethodId(verocard?.id || '')")
  && launch.includes("setStatus('paid')"),
  'Alimentação deve continuar travando Conta Benefício, Verocard e status pago automaticamente.'
);
assert.ok(
  launch.includes('cardStatementMonthForPurchase')
  && launch.includes('cardDueDateForStatement')
  && launch.includes('cardMonthPlus(firstStatement, index)'),
  'Compra no cartão deve continuar calculando competência, vencimento e evolução das parcelas pela fatura.'
);
assert.ok(
  launch.includes('Math.min(48,v+1)') && launch.includes('Math.max(1,v-1)')
  && launch.includes('setInstallmentPreviewOpen(true)')
  && launch.includes('Visualizar parcelas'),
  'Parcelamento deve preservar quantidade editável e prévia das parcelas.'
);
assert.ok(
  launch.includes("role=\"switch\"")
  && launch.includes('Lançar como pendente')
  && launch.includes("setStatus((value) => value === 'planned' ? 'paid' : 'planned')"),
  'Despesa comum deve continuar permitindo alternar entre realizada e pendente.'
);
assert.ok(
  launch.includes('runPhoenixCardPurchaseEdit')
  && launch.includes('runPhoenixCardPurchaseCancel')
  && launch.includes('runPhoenixBenefitEventEdit')
  && launch.includes('runPhoenixSimpleEventEdit')
  && launch.includes('runPhoenixSimpleEventArchive'),
  'Editar lançamento deve preservar rotas específicas de edição, cancelamento e exclusão por domínio.'
);
