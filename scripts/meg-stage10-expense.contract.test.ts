import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brlBackspace,brlDigit,brlFormatted,brlFromPasted,brlSignedDecimal,brlToggleSign,EMPTY_BRL_INPUT} from '../apps/web/src/meg-web-evolution/stage10/brl-money-mask';
import {normalizeFinancialTextInput} from '../apps/web/src/meg-web-evolution/stage10/text-entry-policy';
const read=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const code=read('apps/web/src/meg-web-evolution/stage10/ExpenseForm.tsx');
const preview=read('apps/web/src/meg-web-evolution/stage10/expense-preview.tsx');
const css=read('apps/web/src/meg-web-evolution/stage10/ExpenseForm.css');
const financialSign=read('apps/api/src/modules/finance/amount-sign.ts');
test('Nenhum writer nem comunicação com API no modal QA',()=>{
 assert.doesNotMatch(code,/fetch\(|authenticatedRequest|createFinancialEventProtected|\.post\(|\.patch\(|\.delete\(/);
 assert.match(code,/saveEnabled=false/);
 assert.match(preview,/saveEnabled=\{false\}/);
 assert.match(preview,/data-no-real-writers="true"/);
});
test('Categorias e contas são provenientes dos catálogos ativos, sem IDs fixos',()=>{
 for(const mark of ['categories.filter(x=>x.active)','accounts.filter(x=>x.active)','paymentMethods.filter(x=>x.active)'])assert.ok(code.includes(mark),mark);
 assert.doesNotMatch(code,/qa-category-food|qa-account-benefit|qa-method-benefit/);
 assert.match(code,/frequencyRank/);
 assert.match(code,/CategoryGlyph/);
});
test('Alimentação vinculada explicitamente e sem permitir alterar conta, método e pago',()=>{
 assert.match(code,/benefitBinding/);
 assert.match(code,/binding\?\.categoryIds\.includes\(id\)/);
 assert.match(code,/accountId:binding.accountId,paymentMethodId:binding.paymentMethodId,requestedStatus:'paid'/);
 assert.match(code,/disabled=\{lockedBenefit\}/);
 assert.match(code,/!isCredit&&!isBenefit/);
});
test('Valores em centavos sem erros de float e máscara crescente',()=>{
 let state=EMPTY_BRL_INPUT;
 assert.equal(brlFormatted(state),'0,00');
 state=brlDigit(state,'2');assert.equal(brlFormatted(state),'0,02');
 state=brlDigit(state,'0');assert.equal(brlFormatted(state),'0,20');
 state=brlDigit(state,'0');assert.equal(brlFormatted(state),'2,00');
 assert.equal(brlSignedDecimal(state),'2.00');
 state=brlToggleSign(state);assert.equal(brlFormatted(state),'-2,00');assert.equal(brlSignedDecimal(state),'-2.00');
 assert.equal(brlFormatted(brlBackspace(state)),'-0,20');
 assert.equal(brlFormatted(brlFromPasted('R$ -1.234,56')),'-1.234,56');
 assert.equal(brlSignedDecimal(EMPTY_BRL_INPUT),null);
});
test('Política de estorno depende do domínio, que mantém inversão de sinal para despesa',()=>{
 assert.match(financialSign,/direction \* enteredAmount/);
 assert.match(financialSign,/Math\.abs\(enteredAmount\)/);
 assert.match(code,/isRefund/);
 assert.match(code,/brlToggleSign/);
});
test('Parcelamento abre modal, mas só recebe vencimentos do contrato canônico',()=>{
 assert.match(code,/Mostrar parcelamento/);
 assert.match(code,/schedule.source==='canonical'/);
 assert.match(code,/schedule.rows.length===Number\(draft.installmentsInput\)/);
 assert.match(code,/Nenhuma parcela ou data será estimada pela tela/);
 assert.doesNotMatch(code,/addMonths|new Date\(draft.date\)|Math\.round\(|baseCents/);
});
test('Classificação da conta e tipo de conta são controles separados',()=>{
 for(const label of ['Classificação da conta','Contas gerais','Investimentos','Benefício','Tipo de conta','Conta monetária','Conta benefício'])assert.ok(code.includes(label),label);
 assert.match(code,/setClassification/);
 assert.match(code,/setKind/);
 assert.doesNotMatch(code,/classificationId:/);
});
test('Texto em maiúsculas, mas IDs, data e montante sem conversão',()=>{
 assert.equal(normalizeFinancialTextInput('pão de açúcar, almoço çá'),'PÃO DE AÇÚCAR, ALMOÇO ÇÁ');
 assert.match(code,/patch\('description',normalizeFinancialTextInput\(e.target.value\)\)/);
 assert.match(code,/patch\('notes',normalizeFinancialTextInput\(e.target.value\)\)/);
 assert.match(code,/description:normalizeFinancialTextInput\(s.description\)/);
 assert.doesNotMatch(code,/patch\('date',normalizeFinancialTextInput/);
});
test('Layout sem footer fixo, com navegação alternativa mobile, ícones e modais internos',()=>{
 assert.doesNotMatch(code,/meg-t10-expense-footer/);
 assert.match(code,/meg-t10-expense-mobile-nav/);
 assert.match(css,/height:min\(820px,calc\(100dvh - 16px\)\)/);
 assert.match(css,/overflow:hidden/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/@media\(max-width:639px\)/);
 assert.match(code,/aria-modal="true"/);
});
