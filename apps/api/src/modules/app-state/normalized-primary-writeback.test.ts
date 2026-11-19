import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNormalizationPreview, legacyTransactionToFinancialEvent, normalizationFingerprint } from './normalization-migration-core';
import { mirrorFinancialEventToLegacyTransaction, normalizedMirrorNeedsSourceRefresh, NORMALIZED_LEGACY_MIRROR_SELECT } from './normalized-primary-writeback';

const context = { workspaceId: 'workspace-1', userId: 'user-1', revision: 10 };
const original = {
  id: 'legacy-claro',
  date: '2026-09-10',
  description: 'CLARO MARCOS',
  type: 'expense',
  expenseAmount: 30.9,
  status: 'pending',
  situation: 'PENDENTE',
  paymentMethod: 'BOLETO',
  financialAccountId: 'account-monetary-main',
};

const before = legacyTransactionToFinancialEvent(original, context)!;
const settledEvent = {
  id: 'event-claro',
  legacyTransactionId: original.id,
  date: new Date('2026-09-13T12:00:00.000Z'),
  description: original.description,
  type: 'expense',
  status: 'paid',
  amount: 30.9,
  signedAmount: -30.9,
  notes: null,
  sourcePayload: original,
  accountId: 'account-monetary-main',
  paymentMethod: { name: 'BOLETO' },
};
const mirrored = mirrorFinancialEventToLegacyTransaction(settledEvent);

assert.equal(mirrored.date, '2026-09-13');
assert.equal(mirrored.status, 'paid');
assert.equal(mirrored.situation, 'PAGO');
assert.equal(mirrored.expenseAmount, 30.9);
assert.equal(mirrored.financialAccountId, 'account-monetary-main');
assert.equal(mirrored.paymentMethod, 'BOLETO');
assert.equal(normalizedMirrorNeedsSourceRefresh(settledEvent, mirrored), true);
assert.equal(normalizedMirrorNeedsSourceRefresh({ ...settledEvent, sourcePayload: mirrored }, mirrored), false);
assert.equal(normalizedMirrorNeedsSourceRefresh({ ...settledEvent, sourcePayload: { ...mirrored, z: 1, a: 2 } }, { ...mirrored, a: 2, z: 1 }), false);

const preview = buildNormalizationPreview({ transactions: [mirrored] }, { ...context, revision: 11 });
assert.equal(preview.summary.validCount, 1);
assert.equal(preview.events[0]?.status, 'paid');
assert.equal(preview.events[0]?.date.toISOString().slice(0, 10), '2026-09-13');

const normalizedMirror = {
  ...preview.events[0]!,
  sourcePayload: mirrored,
};
assert.equal(normalizationFingerprint([normalizedMirror]), preview.summary.fingerprint);
assert.notEqual(normalizationFingerprint([before]), preview.summary.fingerprint);

const reversalSource = {
  id: 'legacy-estorno',
  date: '2026-09-14',
  description: 'ESTORNO DESPESA',
  type: 'expense',
  amount: -12.34,
  status: 'paid',
};
const reversalEvent = legacyTransactionToFinancialEvent(reversalSource, context)!;
assert.equal(reversalEvent.signedAmount, 12.34, 'Estorno de despesa deve permanecer positivo no evento normalizado.');
const reversalMirrored = mirrorFinancialEventToLegacyTransaction({
  ...reversalEvent,
  id: 'event-estorno',
  sourcePayload: reversalSource,
});
assert.equal(reversalMirrored.amount, -12.34, 'Writeback deve preservar o sinal negativo do valor digitado no legado.');
const reversalPreview = buildNormalizationPreview({ transactions: [reversalMirrored] }, { ...context, revision: 11 });
assert.equal(reversalPreview.events[0]?.signedAmount, 12.34);
const reversalNormalizedMirror = {
  ...reversalPreview.events[0]!,
  sourcePayload: reversalMirrored,
};
assert.equal(
  normalizationFingerprint([reversalNormalizedMirror]),
  reversalPreview.summary.fingerprint,
  'Reconciliação de startup não pode divergir ao espelhar estorno de despesa.',
);

const source = readFileSync(new URL('./normalized-primary-writeback.ts', import.meta.url), 'utf8');
assert.match(source, /tx\.\$executeRaw/,
  'Atualização de sourcePayload em lote deve evitar um UPDATE por compromisso.');
assert.match(source, /Prisma\.join\(values\)/,
  'Payloads distintos do espelho devem ser enviados em uma única operação parametrizada.');
assert.doesNotMatch(source, /for \(const replacement of sourceRefresh\)[\s\S]*financialEvent\.update/,
  'Writeback não pode reintroduzir N+1 de updates por evento.');
assert.doesNotMatch(source, /stableJson\(nextTransactions\)\s*!==\s*stableJson\(transactions\)/,
  'Detecção de mudança não deve serializar as 3 mil+ transações inteiras duas vezes.');
assert.match(source, /archivedAt:\s*\{ not: null \}/,
  'Reconciliação de startup deve localizar eventos arquivados que ainda existam no AppState.');
assert.match(source, /const activeLegacyIds = new Set/,
  'Reconciliação deve conhecer o conjunto canônico de IDs legados ativos.');
assert.match(source, /const orphanLegacyIds = sourceTransactions[\s\S]*!activeLegacyIds\.has\(id\)/,
  'Transações legadas sem evento normalizado ativo devem ser tratadas como espelho órfão.');
assert.match(source, /new Set\(\[\.\.\.archivedLegacyIds, \.\.\.orphanLegacyIds\]\)/,
  'Arquivados e órfãos devem ser removidos em uma única reconciliação idempotente.');
assert.match(source, /removedLegacyIds[\s\S]*writeBackNormalizedEventsToAppState\(tx, workspaceId, events, removedLegacyIds\)/,
  'IDs legados arquivados devem ser removidos do espelho para evitar divergência permanente.');
assert.doesNotMatch(source, /if \(!events\.length\) return \{ active: true, changed: false/,
  'Reconciliação não pode ignorar exclusões só porque não restaram eventos ativos.');


/* Caracterização Etapa 09: reduzir Egress sem alterar o conteúdo do espelho. */
const mandatoryMirrorFields = [
  'id', 'legacyTransactionId', 'date', 'description', 'type', 'status',
  'amount', 'signedAmount', 'notes', 'sourcePayload', 'accountId', 'paymentMethod',
];
assert.deepEqual(
  Object.keys(NORMALIZED_LEGACY_MIRROR_SELECT).sort(),
  mandatoryMirrorFields.sort(),
  'A projeção deve conter todos e somente os campos usados pelo espelho canônico.',
);
assert.deepEqual(
  NORMALIZED_LEGACY_MIRROR_SELECT.paymentMethod,
  { select: { name: true } },
  'O nome do meio de pagamento deve continuar disponível para a reconciliação.',
);
assert.match(source, /select:\s*NORMALIZED_LEGACY_MIRROR_SELECT/,
  'A reconciliação de startup precisa selecionar a projeção mínima em vez da linha completa.');
assert.doesNotMatch(source, /include:\s*\{\s*paymentMethod:/,
  'Não buscar colunas financeiras que não são consumidas pelo espelho.');

const verboseEvent = {
  ...settledEvent,
  userId: 'user-sintetico',
  workspaceId: 'workspace-sintetico',
  competence: '2026-09',
  categoryId: 'category-sintetica',
  createdAt: new Date('2026-09-10T00:00:00.000Z'),
  updatedAt: new Date('2026-09-13T00:00:00.000Z'),
  sourceRevision: 10,
  amountBehavior: 'NORMAL',
  classificationConfidence: 0.95,
};
const projectionEvent = Object.fromEntries(
  Object.keys(NORMALIZED_LEGACY_MIRROR_SELECT).map(
    (key) => [key, verboseEvent[key as keyof typeof verboseEvent]],
  ),
) as typeof settledEvent;
const fullMirror = mirrorFinancialEventToLegacyTransaction(verboseEvent);
const projectedMirror = mirrorFinancialEventToLegacyTransaction(projectionEvent);
assert.deepEqual(projectedMirror, fullMirror,
  'Excluir colunas não consumidas não pode alterar a representação legada.');
assert.equal(normalizedMirrorNeedsSourceRefresh(verboseEvent, fullMirror),
  normalizedMirrorNeedsSourceRefresh(projectionEvent, projectedMirror),
  'A necessidade de atualizar sourcePayload deve permanecer equivalente.');
assert.equal(
  normalizationFingerprint([{ ...preview.events[0]!, sourcePayload: fullMirror }]),
  normalizationFingerprint([{ ...preview.events[0]!, sourcePayload: projectedMirror }]),
  'A redução de seleção não pode alterar o fingerprint financeiro.',
);

console.log('normalized primary writeback tests passed');
