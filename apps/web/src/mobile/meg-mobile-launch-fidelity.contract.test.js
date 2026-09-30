import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const launch = readFileSync(new URL('./MegMobileLaunchSheet.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-launch-sheet.css', import.meta.url), 'utf8');
const picker = readFileSync(new URL('./MegMobilePicker.tsx', import.meta.url), 'utf8');
const pickerCss = readFileSync(new URL('./meg-mobile-picker.css', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./MegMobileCoreScreens.tsx', import.meta.url), 'utf8');
const history = readFileSync(new URL('./meg-mobile-description-history.ts', import.meta.url), 'utf8');

assert.doesNotMatch(launch, /<select\\b/i, 'Novo/Editar não pode usar select nativo.');
for (const token of ['O que deseja lançar?', 'Saídas e gastos', 'Entradas e recebimentos', 'Usa o benefício (Verocard)', "setStep('form')", "setStep('success')"]) {
  assert.ok(launch.includes(token), 'Fluxo validado ausente: ' + token);
}
assert.ok(!launch.includes('Tipo de conta *') && !launch.includes('meg3-account-kind'), 'Implementação rejeitada de Tipo de conta não pode permanecer como legado.');
assert.ok(!launch.includes('meg3-form-segment'), 'Abas antigas Despesa/Receita/Alimentação não podem permanecer.');
const descriptionIndex = launch.indexOf('>Descrição</span>');
const categoryIndex = launch.indexOf("label={mode === 'income' ? 'Classificação da receita (opcional)' : 'Categoria *'}");
const modalityIndex = launch.indexOf('Modalidade de pagamento');
const paymentIndex = launch.indexOf("label={mode === 'income' ? 'Forma de recebimento *' : 'Forma de pagamento *'}");
const accountIndex = launch.indexOf("label={mode === 'income' ? 'Conta *' : 'Conta *'}");
assert.ok(descriptionIndex >= 0 && descriptionIndex < categoryIndex && categoryIndex < modalityIndex && modalityIndex < paymentIndex && paymentIndex < accountIndex, 'Ordem canônica deve ser Descrição, Categoria, Modalidade, Forma e Conta.');

assert.ok(launch.includes('loadMegMobileHistorySuggestions') && launch.includes('Digite para pesquisar no seu histórico') && launch.includes('useHistorySuggestion') && launch.includes('setCategoryId(category.id)') && launch.includes('setPaymentMethodId(method.id)') && launch.includes('setAccountId(account.id)'), 'Autocomplete deve recuperar categoria, forma e conta.');
assert.ok(history.includes('loadPhoenixAllEvents') && history.includes('occurrences') && history.includes('lastDate'), 'Autocomplete deve usar histórico financeiro completo.');
assert.ok(launch.includes("if (mode !== 'benefit') return;") && launch.includes("setAccountId(benefitAccount?.id || '')") && launch.includes("setPaymentMethodId(verocard?.id || '')") && launch.includes("setStatus('paid')"), 'Alimentação deve travar Benefício, Verocard e Pago.');
assert.ok(launch.includes('Campos automáticos') && launch.includes('Conta, forma de pagamento e situação são definidos automaticamente'), 'Alimentação deve explicar os campos automáticos.');
assert.ok(launch.includes('cardStatementMonthForPurchase') && launch.includes('cardDueDateForStatement') && launch.includes('Fatura / Competência'), 'Crédito deve calcular e exibir competência da fatura.');
assert.ok(launch.includes('Math.max(1,v-1)') && launch.includes('Math.min(48,v+1)') && launch.includes('Parcelas do lançamento') && launch.includes('Editar número de parcelas'), 'Parcelamento deve ser editável e visualizável.');
assert.ok(launch.includes("setStatus('planned'); setAccountId(''); setPaymentMethodId('');") && launch.includes('Este lançamento será incluído em Pendentes.'), 'Pendente não pode fabricar conta ou forma de pagamento.');
assert.ok(launch.includes("accountId: pending ? undefined") && launch.includes("paymentMethodId: pending ? undefined"), 'Persistência pendente deve preservar campos ausentes.');
assert.ok(launch.includes('runPhoenixCardPurchaseEdit') && launch.includes('runPhoenixCardPurchaseCancel') && launch.includes('runPhoenixBenefitEventEdit') && launch.includes('runPhoenixSimpleEventEdit') && launch.includes('runPhoenixSimpleEventArchive'), 'Edição deve preservar gateways canônicos.');
assert.ok(launch.includes('LANÇAMENTO SALVO') && launch.includes('Novo lançamento') && launch.includes('Voltar para Início'), 'Salvar deve abrir confirmação final validada.');

assert.ok(css.includes('.meg3-launch-type-cards') && css.includes('.meg3-launch-scroll') && css.includes('overflow-y:auto') && css.includes('@media(max-width:350px)') && css.includes('@media(min-width:700px)'), 'Fluxo deve ser responsivo e rolar apenas internamente.');
assert.ok(!css.includes('.meg3-account-kind') && !css.includes('.meg3-form-segment'), 'CSS rejeitado deve ser excluído, não escondido.');
assert.ok(picker.includes('data-meg-scroll-region="true"'), 'Picker deve manter rolagem interna.');
assert.ok(picker.includes('meg5-picker-search-trigger') && picker.includes('!searching ? <button') && picker.includes('<input ref={searchRef} autoFocus'), 'Pesquisa do picker deve abrir somente pelo botão Buscar.');
assert.ok(pickerCss.includes('position:sticky') && pickerCss.includes('touch-action:pan-y'), 'Busca deve permanecer no topo e lista deve priorizar gesto vertical.');
assert.ok(launch.includes('uniquePickerOptions(categories)'), 'Categorias duplicadas devem aparecer uma única vez no seletor.');
assert.ok(launch.includes('isMainMonetaryAccount') && launch.includes('setAccountId(mainMonetaryAccount.id)'), 'Conta monetária principal deve ser pré-selecionada.');
assert.ok(launch.includes('formatCurrencyInput') && launch.includes('inputMode="numeric"'), 'Valor deve usar máscara monetária brasileira da direita para a esquerda.');
assert.ok(launch.includes('meg3-value-sign') && launch.includes("mode === 'expense'"), 'Estorno deve ser um controle compacto junto ao valor e exclusivo de despesa.');
assert.ok(launch.includes('Vencimento da 1ª parcela') && launch.includes('firstInstallment.due'), 'Crédito deve mostrar vencimento calculado da primeira parcela.');
assert.ok(launch.includes("expensePaymentMode === 'credit') setStatus('planned')"), 'Crédito deve iniciar como pendente.');
assert.ok(launch.includes("mode === 'income' ? 'Data do recebimento'"), 'Receita deve usar Data do recebimento.');
assert.ok(launch.includes('isIncomeReceiptMethod') && launch.includes('dinheiro|transferencia banc'), 'Receita deve restringir recebimento a Dinheiro, PIX e Transferência Bancária.');
assert.ok(launch.includes('onBlur={closeHistoryForKeyboardDismiss}'), 'Sugestões do histórico devem fechar com o teclado/foco.');
assert.ok(launch.includes("categories.find((item) => normalize(item.name) === normalize(suggestion.categoryName))"), 'Histórico deve recuperar categoria canônica por descrição sem depender do grupo duplicado.');

assert.ok(movements.includes("[category, account].filter(Boolean).join(' · ')") && movements.includes('meg3-payment-label') && movements.includes('onClick={() => onOpenEvent(event)}'), 'Lançamentos deve preservar contexto e edição direta.');
assert.ok(movements.includes('className="meg3-event-list" data-meg-scroll-region="true"'), 'Somente lista de lançamentos deve rolar.');
console.log('Contrato do fluxo validado de Novo/Editar lançamento aprovado.');

{
  assert.ok(picker.includes("searchRef.current?.blur()"), 'Fechar seletor deve dispensar teclado explicitamente.');
  assert.ok(picker.includes("meg5-picker-sheet ${searching ? 'is-searching' : ''}"), 'Busca deve ativar layout ancorado próprio.');
  assert.ok(picker.includes('item.icon') && picker.includes('MegIcon name={item.icon}'), 'Opções devem aceitar ícone SVG contextual.');
  assert.ok(pickerCss.includes('.meg5-picker-sheet.is-searching') && pickerCss.includes('align-self:start'), 'Busca com teclado deve ficar no topo da safe area.');
  assert.ok(pickerCss.includes('.meg5-picker-option-icon'), 'Categoria deve ter container visual de ícone.');
  assert.ok(launch.includes('resolveFinancialIcon') && launch.includes('icon, tone'), 'Categorias devem receber iconografia financeira real.');
  assert.ok(css.includes('.meg3-launch-type-cards button:nth-child(1)') && css.includes('rgba(255,83,111') && css.includes('rgba(62,238,155') && css.includes('rgba(246,209,75'), 'Cards Despesa, Receita e Alimentação devem usar cores neon integrais.');
}
