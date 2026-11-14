import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardStatementDueDate} from '../apps/api/src/modules/finance/card-statement-canonical.ts';

/** Etapa 10: contrato de leitura, não habilita mutação/preview financeira na Web. */
assert.equal(cardStatementDueDate('2026-11',25,5),'2026-12-07','Fechamento 25, vencimento 5: mês seguinte e ajuste de sábado');
assert.equal(cardStatementDueDate('2026-11',5,12),'2026-11-12','Vencimento após fechamento no mesmo mês');
assert.equal(cardStatementDueDate('2026-09',28,3),'2026-10-05','Vencimento de sábado ajusta para segunda-feira');

const cardRoutes=readFileSync('apps/api/src/modules/cards/routes.ts','utf8');
const cardService=readFileSync('apps/api/src/modules/cards/service.ts','utf8');
const finance=readFileSync('apps/api/src/modules/finance/service.ts','utf8');
const web=readFileSync('apps/web/src/meg-web-evolution/stage10/BatchEditQa.tsx','utf8');
assert.match(cardService,/purchaseDate\.getUTCDate\(\) > card\.closingDay \? 1 : 0/,'Competência inicial vem do writer de cartões');
assert.match(cardRoutes,/CARD_PURCHASE_PAYMENT_EXISTS/,'Compras pagas ou parcialmente pagas protegidas');
assert.match(cardRoutes,/shouldRecalculateStatementMonths/,'Troca de cartão/data reconcilia competência');
assert.match(cardRoutes,/CARD_PURCHASE_UPDATED/,'Atualização de compra audita antes/depois');
assert.match(finance,/FINANCIAL_EVENT_LINKED_DOMAIN/,'Evento com domínio vinculado não aceita edição genérica');
assert.match(web,/A competência, o vencimento efetivo e as parcelas serão retornados pela autoridade financeira canônica/,'Modal não recalcula fatura');
assert.doesNotMatch(web,/\b(?:cardStatementDueDate|addMonths|financialAmountValues|monetaryBalanceAt)\s*\(/,'Frontend não chama regras financeiras');
console.log('MEG_STAGE10_BATCH_CARD_READONLY_CONTRACT PASS');
