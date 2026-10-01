import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const grids = readFileSync(new URL('./screens/PhoenixWebGridScreens.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const client = readFileSync(new URL('../app/receivables-client.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-web-2026.css', import.meta.url), 'utf8');

assert.match(app, /PhoenixReceivablesGrid data=\{data\} onDataCommitted=\{onDataCommitted\}/,
  'Contas a receber deve reconciliar mutações com o snapshot global.');

assert.match(grids, /receivablesClient\.createReceivable/,
  'Novo título deve usar o domínio oficial de recebíveis.');
assert.match(grids, /receivablesClient\.receive/,
  'Baixa deve usar o writer transacional de recebimentos.');
assert.match(grids, /loadPhoenixReadModel\(data\.month, \{ force: true \}\)/,
  'Após mutação a tela deve reler o snapshot oficial antes de refletir a operação.');
assert.match(grids, /operationId\('web-receivable'/,
  'Criação de título deve possuir identidade idempotente estável.');
assert.match(grids, /operationId\('web-receipt'/,
  'Recebimento deve possuir identidade idempotente estável.');
assert.match(grids, /Conta que recebeu \*/,
  'Baixa Web deve exigir conta monetária para refletir o recebimento no caixa.');
assert.match(grids, /Forma de recebimento \*/,
  'Baixa Web deve exigir forma de recebimento.');
assert.match(grids, /\['checking', 'savings', 'cash'\]/,
  'Recebimento deve limitar a conta a escopos monetários.');
assert.match(grids, /FUTURE_RECEIPT_NOT_ALLOWED/,
  'Data futura deve possuir tratamento operacional claro.');
assert.match(grids, /AMOUNT_EXCEEDS_OPEN_BALANCE/,
  'Baixa superior ao saldo aberto deve ser tratada sem gravar parcialmente.');
assert.match(grids, /Recebimentos anteriores/,
  'Modal de baixa deve mostrar o histórico recente do título.');
assert.match(grids, /Principal recebido \*/,
  'Recebimento parcial deve permanecer suportado explicitamente.');
assert.match(grids, /Juros[\s\S]*Multa/,
  'Acréscimos do recebimento devem permanecer disponíveis na baixa.');

assert.match(client, /createReceivable:[\s\S]*operationId\?: string/,
  'Cliente de recebíveis deve transportar idempotência na criação.');
assert.match(client, /receive:[\s\S]*operationId\?: string/,
  'Cliente de recebíveis deve transportar idempotência na baixa.');

assert.match(css, /meg-web-receivable-overlay/,
  'Novo título e baixa devem usar modal Web próprio.');
assert.match(css, /meg-web-receivable-summary/,
  'Baixa deve possuir resumo financeiro antes da confirmação.');
assert.match(css, /@media\(max-width:720px\)/,
  'Fluxo operacional de recebíveis deve permanecer utilizável em viewport estreito.');

console.log('Contrato operacional Web de contas a receber validado: criação, baixa, idempotência e snapshot oficial.');
