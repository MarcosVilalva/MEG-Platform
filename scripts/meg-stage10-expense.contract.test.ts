import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const code=read('apps/web/src/meg-web-evolution/stage10/ExpenseForm.tsx');
const preview=read('apps/web/src/meg-web-evolution/stage10/expense-preview.tsx');
const html=read('apps/web/meg-stage10-expense-qa.html');
const css=read('apps/web/src/meg-web-evolution/stage10/ExpenseForm.css');
test('Nova Despesa não possui fetch nem ação de escrita financeira',()=>{
 assert.doesNotMatch(code,/fetch\(|authenticatedRequest|createFinancialEventProtected|\.post\(|\.patch\(|\.delete\(/);
 assert.match(code,/saveEnabled=false/);
 assert.match(preview,/saveEnabled=\{false\}/);
 assert.match(preview,/data-no-real-writers="true"/);
});
test('catálogos filtrados por ativo, sem IDs de produção no formulário',()=>{
 for(const marker of ['categories.filter(x=>x.active)','accounts.filter(x=>x.active)','paymentMethods.filter(x=>x.active)'])assert.ok(code.includes(marker),marker);
 assert.doesNotMatch(code,/qa-category-food|qa-account-benefit|qa-method-benefit/);
});
test('Alimentação obriga vínculos explícitos, pagamento pago e travamento do catálogo',()=>{
 assert.match(code,/benefitBinding/);
 assert.match(code,/binding\?\.categoryIds\.includes\(id\)/);
 assert.match(code,/accountId:binding.accountId,paymentMethodId:binding.paymentMethodId,requestedStatus:'paid'/);
 assert.match(code,/disabled=\{lockedBenefit\}/);
 assert.match(code,/requiresDomainReview=isCredit\|\|isBenefit/);
});
test('crédito usa dados de cartão e parcelas sem cálculo local',()=>{
 assert.match(code,/isCredit&&<fieldset/);
 assert.match(code,/creditCardId/);
 assert.match(code,/firstInstallmentDate/);
 assert.doesNotMatch(code,/Math\.round\(|\/\s*installments|totalInstallments|calculateInvoice/);
});
test('modal tem título, campos principais, Escape e breakpoints oficiais',()=>{
 for(const field of ['Descrição','Categoria','Conta','Forma de pagamento','Data do lançamento','Valor','Status solicitado','Observações','Resumo do lançamento'])assert.ok(code.includes(field),field);
 assert.match(code,/aria-modal="true"/);
 assert.match(code,/event.key==='Escape'/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/@media\(max-width:639px\)/);
 assert.match(html,/expense-preview\.tsx/);
});

test('Classificação da conta e Tipo de conta são controles distintos, somente visuais',()=>{
 for(const label of ['Classificação da conta','Contas gerais','Investimentos','Benefício','Tipo de conta','Conta monetária','Conta benefício']){
  assert.ok(code.includes(label),label);
 }
 assert.match(code,/setAccountClassification/);
 assert.match(code,/setAccountKind/);
 assert.doesNotMatch(code,/classificationId:/);
});
test('Texto financeiro livre usa normalização em maiúsculas; IDs e montantes não',async()=>{
 const {normalizeFinancialTextInput}=await import('../apps/web/src/meg-web-evolution/stage10/text-entry-policy');
 assert.equal(normalizeFinancialTextInput('pão de açúcar, almoço çá'),'PÃO DE AÇÚCAR, ALMOÇO ÇÁ');
 assert.match(code,/patch\('description',normalizeFinancialTextInput\(e.target.value\)\)/);
 assert.match(code,/patch\('notes',normalizeFinancialTextInput\(e.target.value\)\)/);
 assert.match(code,/description:normalizeFinancialTextInput\(suggestion.description\)/);
 assert.doesNotMatch(code,/patch\('amountInput',normalizeFinancialTextInput/);
 assert.doesNotMatch(code,/patch\('date',normalizeFinancialTextInput/);
});
