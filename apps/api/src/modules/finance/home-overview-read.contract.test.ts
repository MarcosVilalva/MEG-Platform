import assert from 'node:assert/strict';
import { projectHomeMetrics } from './home-overview-read';

const sample = projectHomeMetrics([
  {status:'open',openAmount:100.10},
  {status:'partial',openAmount:50.20},
  {status:'paid',openAmount:0},
  {status:'cancelled',openAmount:999},
], [
  {payableStatementAmount:20.10},
  {payableStatementAmount:10.20},
  {payableStatementAmount:0},
]);
assert.deepEqual(sample,{
  payables:{openAmount:150.30,count:2},
  cards:{openAmount:30.30,count:2},
  paid:{count:1},
});
assert.deepEqual(projectHomeMetrics([],[]),{
  payables:{openAmount:0,count:0},cards:{openAmount:0,count:0},paid:{count:0},
});
assert.throws(()=>projectHomeMetrics([{status:'open',openAmount:NaN}],[]),/INVALID_HOME_FINANCIAL_VALUE/);
console.log('PASS Home overview: agregação somente-leitura, centavos, estados e ausência');
