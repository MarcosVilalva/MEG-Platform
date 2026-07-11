import assert from 'node:assert/strict';
import { parseImportedRawRow } from './repair';

const base = { DATA: '45800', DiaSemana: 'SEG', 'TP LANÇAMENTO': 'DESPESA', DESCRIÇÃO: 'Mercado', 'RECEITA($)': '', 'CLASSIFIÇÃO DA DESPESA': 'CONTAS GERAIS', GRUPO: 'SUPERMERCADO', 'DESPESA (R$)': '123,45', 'FORMA DE PAGAMENTO': 'PIX', SITUAÇÃO: 'PAGO' };
const expense = parseImportedRawRow(base);
assert.equal(expense.description, 'Mercado'); assert.equal(expense.type, 'expense'); assert.equal(expense.amount, 123.45); assert.equal(expense.signedAmount, -123.45); assert.equal(expense.status, 'paid');
const income = parseImportedRawRow({ ...base, 'TP LANÇAMENTO': 'RECEITA', DESCRIÇÃO: 'Salário', 'RECEITA($)': '5000,00', 'DESPESA (R$)': '' });
assert.equal(income.type, 'income'); assert.equal(income.signedAmount, 5000);
const refund = parseImportedRawRow({ ...base, DESCRIÇÃO: 'Estorno', 'DESPESA (R$)': '-50,00' });
assert.equal(refund.type, 'expense'); assert.equal(refund.amount, -50); assert.equal(refund.signedAmount, 50); assert.equal(refund.isRefund, true);
assert.equal(expense.group, 'SUPERMERCADO'); assert.equal(expense.paymentName, 'PIX');
const positional = parseImportedRawRow(Object.fromEntries(Object.entries(base).map(([key, value], index) => [`coluna-${index}`, value])));
assert.equal(positional.description, 'Mercado'); assert.equal(positional.type, 'expense'); assert.equal(positional.paymentName, 'PIX');
assert.throws(() => parseImportedRawRow({ ...base, DESCRIÇÃO: '' }), /MISSING_DESCRIPTION/);
console.log('Import repair tests passed.');
