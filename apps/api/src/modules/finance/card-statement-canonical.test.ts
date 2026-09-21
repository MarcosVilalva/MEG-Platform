import assert from 'node:assert/strict';
import {
  buildCanonicalCardStatement,
  cardStatementDueDate,
  cardStatementEffectFromSignedAmount,
  canonicalCardStatementTotals,
  legacyCardStatementEffect,
} from './card-statement-canonical';

assert.equal(cardStatementEffectFromSignedAmount(-100), 100);
assert.equal(cardStatementEffectFromSignedAmount(62), -62);
assert.equal(legacyCardStatementEffect({ amount: -62, expenseAmount: 62 }), -62);
assert.equal(legacyCardStatementEffect({ signedAmount: 31, expenseAmount: 31 }), -31);
assert.equal(legacyCardStatementEffect({ expenseAmount: 40 }), 40);
assert.equal(cardStatementDueDate('2026-09', 28, 3), '2026-10-05', 'sábado 03/10/2026 deve ir para segunda 05/10/2026');
assert.equal(cardStatementDueDate('2026-09', 28, 4), '2026-10-05', 'domingo 04/10/2026 deve ir para segunda 05/10/2026');
assert.equal(cardStatementDueDate('2026-09', 28, 5), '2026-10-05', 'dia útil deve permanecer inalterado');

const azul = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['AZUL', 'CARTÃO AZUL'],
  purchases: [],
  events: [
    { id: 'base', description: 'COMPRAS', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: -1875.52, sourcePayload: { paymentMethod: 'CARTÃO AZUL', modality: 'CREDITO' } },
    { id: 'fee', description: 'ANUIDADE 1/1', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: -62, sourcePayload: { paymentMethod: 'CARTÃO AZUL', modality: 'CREDITO' } },
    { id: 'refund', description: 'EXTORNO ANUIDADE 1/1', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: 62, sourcePayload: { paymentMethod: 'CARTÃO AZUL', modality: 'CREDITO' } },
  ],
});
assert.equal(azul.charges, 1937.52);
assert.equal(azul.credits, 62);
assert.equal(azul.netAmount, 1875.52);
assert.equal(azul.payableAmount, 1875.52);
assert.equal(azul.creditBalance, 0);

const latam = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['LATAM', 'CARTÃO LATAM PASS'],
  purchases: [],
  events: [
    { id: 'latam-base', description: 'COMPRAS', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: -3453.24, sourcePayload: { paymentMethod: 'CARTÃO LATAM PASS', modality: 'CREDITO' } },
    { id: 'latam-refund', description: 'EXTORNO ANUIDADE 1/1', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: 31, sourcePayload: { paymentMethod: 'CARTÃO LATAM PASS', modality: 'CREDITO' } },
  ],
});
assert.equal(latam.charges, 3453.24);
assert.equal(latam.credits, 31);
assert.equal(latam.netAmount, 3422.24);
assert.equal(latam.payableAmount, 3422.24);

const partialRefund = canonicalCardStatementTotals([
  { id: 'a', source: 'financial-event', description: 'Compra', effect: 200, kind: 'charge', purchaseDate: '2026-09-01', dueDate: '2026-09-16', statementMonth: '2026-09', installmentNo: 1, installmentQty: 1, isOpen: true, sourceStatus: 'planned' },
  { id: 'b', source: 'financial-event', description: 'Estorno parcial', effect: -50, kind: 'credit', purchaseDate: '2026-09-02', dueDate: '2026-09-16', statementMonth: '2026-09', installmentNo: 1, installmentQty: 1, isOpen: true, sourceStatus: 'planned' },
]);
assert.deepEqual(partialRefund, { charges: 200, credits: 50, netAmount: 150, openCharges: 200, openCredits: 50, openNetAmount: 150, payableAmount: 150, creditBalance: 0 });

const creditStatement = canonicalCardStatementTotals([
  { id: 'a', source: 'financial-event', description: 'Compra', effect: 50, kind: 'charge', purchaseDate: '2026-09-01', dueDate: '2026-09-16', statementMonth: '2026-09', installmentNo: 1, installmentQty: 1, isOpen: true, sourceStatus: 'planned' },
  { id: 'b', source: 'financial-event', description: 'Crédito', effect: -80, kind: 'credit', purchaseDate: '2026-09-02', dueDate: '2026-09-16', statementMonth: '2026-09', installmentNo: 1, installmentQty: 1, isOpen: true, sourceStatus: 'planned' },
]);
assert.equal(creditStatement.netAmount, -30);
assert.equal(creditStatement.payableAmount, 0);
assert.equal(creditStatement.creditBalance, 30);

const officialWithCredit = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['AZUL'],
  events: [
    { id: 'projection', description: 'Compra projetada', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: -100, sourcePayload: { paymentMethod: 'AZUL', modality: 'CREDITO', purchaseId: 'p1' } },
  ],
  purchases: [{
    id: 'p1',
    description: 'Compra oficial',
    purchaseDate: '2026-08-10',
    installments: 1,
    status: 'active',
    entries: [
      { id: 'i1', number: 1, amount: 100, statementMonth: '2026-09', status: 'open' },
      { id: 'i2', number: 2, amount: -20, statementMonth: '2026-09', status: 'open' },
    ],
  }],
});
assert.equal(officialWithCredit.lines.length, 2, 'projeção normalizada não pode duplicar a compra oficial');
assert.equal(officialWithCredit.netAmount, 80);
assert.equal(officialWithCredit.openNetAmount, 80);
assert.equal(officialWithCredit.credits, 20);

const ignored = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['AZUL'],
  purchases: [],
  events: [
    { id: 'draft', description: 'Rascunho', type: 'expense', status: 'draft', date: '2026-09-16', signedAmount: -100, sourcePayload: { paymentMethod: 'AZUL', modality: 'CREDITO' } },
    { id: 'other', description: 'Outro cartão', type: 'expense', status: 'planned', date: '2026-09-16', signedAmount: -200, sourcePayload: { paymentMethod: 'OUTRO', modality: 'CREDITO' } },
  ],
});
assert.equal(ignored.netAmount, 0);
assert.equal(ignored.openNetAmount, 0);
assert.equal(ignored.status, 'empty');

const paidHistory = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['AZUL'],
  purchases: [],
  events: [
    { id: 'paid-charge', description: 'Compra paga', type: 'expense', status: 'paid', date: '2026-10-02', competence: '2026-09', signedAmount: -100, sourcePayload: { date: '2026-09-16', paymentMethod: 'AZUL', modality: 'CREDITO' } },
    { id: 'paid-refund', description: 'Estorno pago', type: 'expense', status: 'paid', date: '2026-10-02', competence: '2026-09', signedAmount: 20, sourcePayload: { date: '2026-09-16', paymentMethod: 'AZUL', modality: 'CREDITO' } },
  ],
});
assert.equal(paidHistory.netAmount, 80, 'histórico da fatura deve preservar valores após a baixa, mesmo quando o pagamento muda a data do evento');
assert.equal(paidHistory.openNetAmount, 0, 'itens pagos não permanecem no saldo aberto');
assert.equal(paidHistory.status, 'paid');

console.log('Canonical card statement sign rules: OK');
