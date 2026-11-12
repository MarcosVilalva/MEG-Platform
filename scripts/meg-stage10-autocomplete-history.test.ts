import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionFromSuggestion, suggestionsFromCanonicalHistory } from '../apps/web/src/meg-web-evolution/stage10/autocomplete-history';

const history = {
  kind: 'complete' as const,
  protocol: 'financial-history-v1' as const,
  items: [
    { id:'e2', description:'Supermercado São José', date:'2026-10-11', amount:209.99,
      categoryId:'cat-food', accountId:'acc-benefit', paymentMethodId:'method-verocard',
      category:{id:'cat-food',name:'Alimentação'},account:{id:'acc-benefit',name:'Conta Benefício'},
      paymentMethod:{id:'method-verocard',name:'Verocard'} },
    { id:'e1', description:'Supermercado São José', date:'2026-10-08', amount:98,
      categoryId:'cat-food', accountId:'acc-benefit', paymentMethodId:'method-verocard' },
    { id:'e3', description:'Supermercado São José', date:'2026-10-01', amount:30,
      categoryId:'cat-food', accountId:'acc-checking', paymentMethodId:'method-pix' },
    { id:'e4', description:'Farmácia Central', amount:60, date:'2026-11-05' },
  ],
};
test('reconhece descrição sem diferenciar acento ou maiúscula', () => {
  assert.equal(suggestionsFromCanonicalHistory(history, 'sao jose').length, 2);
});

test('mesma descrição com formas e contas diferentes preserva escolhas distintas', () => {
  const result = suggestionsFromCanonicalHistory(history, 'supermercado');
  assert.equal(result.length, 2);
  assert.equal(result[0].accountId, 'acc-benefit');
  assert.equal(result[1].accountId, 'acc-checking');
});

test('seleção nunca copia data, valor, competência ou status', () => {
  const result = suggestionsFromCanonicalHistory(history, 'supermercado')[0];
  assert.deepEqual(selectionFromSuggestion(result), {
    description:'Supermercado São José', categoryId:'cat-food',
    accountId:'acc-benefit', paymentMethodId:'method-verocard',
  });
  for (const key of ['date','amount','status','competence']) {
    assert.equal(Object.prototype.hasOwnProperty.call(result,key),false);
  }
});

test('snapshot incompleto não oferece sugestão potencialmente enganosa', () => {
  assert.deepEqual(suggestionsFromCanonicalHistory({
    kind:'limit-exceeded', protocol:'financial-history-v1', total:6000, limit:5000,
  }, 'mercado'), []);
});

test('entrada muito curta não pesquisa e limite de sugestões é respeitado', () => {
  assert.deepEqual(suggestionsFromCanonicalHistory(history,'s'),[]);
  assert.equal(suggestionsFromCanonicalHistory(history,'super',1).length,1);
  assert.equal(suggestionsFromCanonicalHistory(history,'super',0).length,0);
});
