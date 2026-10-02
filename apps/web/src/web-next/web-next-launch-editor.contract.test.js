import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const editor = readFileSync(join(here, 'components/WebNextLaunchEditor.tsx'), 'utf8');
const writer = readFileSync(join(here, 'components/WebNextLaunchWriteControl.tsx'), 'utf8');
const css = readFileSync(join(here, 'styles/launch-editor.css'), 'utf8');
const app = readFileSync(join(here, '../phoenix/PhoenixApp.tsx'), 'utf8');
const legacy = readFileSync(join(here, '../phoenix/screens/PhoenixMovementsV15.tsx'), 'utf8');

assert.match(editor, /data-web-next-overlay="launch-editor"/);
assert.match(editor, /role="dialog"[\s\S]*aria-modal="true"/);
assert.match(editor, /Nova transferência|Nova receita|Nova despesa/);
assert.match(editor, /À vista|Recebimento/);
assert.match(editor, /Crédito/);
assert.match(editor, /Crediário/);
assert.match(editor, /Benefício/);
assert.match(editor, /Crédito \/ recarga do Verocard/);
assert.match(editor, /Verocard Alimentação/);
assert.match(editor, /benefitAccount/);
assert.match(editor, /verocardMethod/);
assert.match(editor, /descriptionMatches/);
assert.match(editor, /applyHistory/);
assert.match(editor, /O valor e a data nunca são copiados do histórico/);
assert.match(editor, /cardDueDateForPurchase/);
assert.match(editor, /cardStatementMonthForPurchase/);
assert.match(editor, /Math\.min\(48/);
assert.match(editor, /Visualizar \{draft\.installments\} parcelas/);
assert.match(editor, /financeClient\.getMonetaryBalance/);
assert.match(editor, /transferBalance\.available/);
assert.match(editor, /Saldo suficiente/);
assert.match(editor, /Faltam \{money\.format\(transferMissing\)\}/);
assert.match(editor, /sourceAccountId/);
assert.match(editor, /destinationAccountId/);
assert.match(editor, /runPhoenixSimpleEventEdit/);
assert.match(editor, /runPhoenixBenefitEventEdit/);
assert.match(editor, /runPhoenixCardPurchaseEdit/);
assert.match(editor, /runPhoenixSimpleEventArchive/);
assert.match(editor, /runPhoenixCardPurchaseCancel/);
assert.match(editor, /Transferências confirmadas não são editadas/);
assert.match(editor, /disabled=\{Boolean\(editingId && paymentMode !== mode\)\}/);
assert.doesNotMatch(editor, /className="px-|className=\{\`px-/,
  'Novo/Editar Web Next não pode herdar classes visuais Phoenix.');

assert.match(writer, /getPhoenixRuntimeWriteCapabilities/);
assert.match(writer, /preparePhoenixSimpleEvent/);
assert.match(writer, /preparePhoenixBenefitEvent/);
assert.match(writer, /preparePhoenixCardPurchase/);
assert.match(writer, /preparePhoenixTransfer/);
assert.match(writer, /runPhoenixSimpleEventWrite/);
assert.match(writer, /runPhoenixBenefitEventWrite/);
assert.match(writer, /runPhoenixCardPurchaseWrite/);
assert.match(writer, /runPhoenixTransferWrite/);
assert.match(writer, /Confirmar possível duplicidade/);
assert.doesNotMatch(writer, /className="px-|className=\{\`px-/,
  'Write control clean-room não pode depender de classes visuais Phoenix.');

assert.match(css, /\.mnx-editor-overlay[\s\S]*position:fixed/);
assert.match(css, /\.mnx-editor-dialog[\s\S]*overflow:hidden/);
assert.match(css, /\.mnx-editor-form[\s\S]*overflow-x:hidden[\s\S]*overflow-y:auto/);
assert.match(css, /scrollbar-color:rgba\(73,240,223/);
assert.match(css, /@media \(max-width:900px\)/);
assert.match(css, /@media \(max-width:620px\)/);
assert.doesNotMatch(css, /overflow-x:\s*auto/,
  'Editor Web Next não pode criar rolagem horizontal.');
assert.doesNotMatch(css, /\.px-/,
  'CSS do editor Web Next não pode estilizar legado Phoenix.');

assert.match(app, /import \{ WebNextLaunchEditor \}/);
const webMovementStart = app.indexOf("if (!nativeOperational && view === 'movements')");
const legacyShellStart = app.indexOf('return <div className="phoenix-v15"', webMovementStart);
assert.ok(webMovementStart >= 0 && legacyShellStart > webMovementStart);
const webMovementBranch = app.slice(webMovementStart, legacyShellStart);
assert.match(webMovementBranch, /<WebNextLaunchEditor/);
assert.doesNotMatch(webMovementBranch, /<PhoenixMovementsV15/,
  'Rota Web de Lançamentos não pode montar o editor visual Phoenix.');
assert.match(app, /setEditEventRequest\(''\);[\s\S]*setTimeout\(\(\) => setEditEventRequest\(eventId\), 0\)/,
  'O mesmo lançamento deve poder ser reaberto em sequência.');

const nativeEntry = app.indexOf("if (nativeOperational && viewData");
assert.ok(nativeEntry >= 0 && nativeEntry < webMovementStart,
  'Android precisa continuar resolvido antes do Web Next.');

assert.doesNotMatch(legacy, /editorOnly/,
  'A ponte editorOnly deve desaparecer quando o editor Web Next assume a rota Web.');
assert.match(legacy, /launchPreset === 'transfer'/,
  'Fluxos antigos ainda consumidores de PhoenixMovements devem preservar abertura de transferência.');

console.log('Web Next launch editor contract: OK');
