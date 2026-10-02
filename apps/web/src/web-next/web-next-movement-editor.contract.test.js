import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const editor = readFileSync(join(here, 'components/WebNextMovementEditor.tsx'), 'utf8');
const gateway = readFileSync(join(here, 'data/movement-editor-gateway.ts'), 'utf8');
const css = readFileSync(join(here, 'styles/movement-editor.css'), 'utf8');
const app = readFileSync(join(here, '../phoenix/PhoenixApp.tsx'), 'utf8');

assert.match(editor, /data-web-next-overlay="movement-editor"/);
assert.match(editor, /Despesa[\s\S]*Receita[\s\S]*Alimentação[\s\S]*Transferência/);
assert.match(editor, /Compra com benefício[\s\S]*Crédito \/ recarga/);
assert.match(editor, /Classificação[\s\S]*Categoria/);
assert.match(editor, /Forma de pagamento/);
assert.match(editor, /Forma de recebimento/);
assert.match(editor, /Parcelas/);
assert.match(editor, /Vencimento calculado/);
assert.match(editor, /Estorno \/ reversão/);
assert.match(editor, /ALTERAÇÕES NÃO SALVAS/);
assert.match(editor, /EXCLUIR LANÇAMENTO/);
assert.match(editor, /Possível duplicidade/);
assert.match(editor, /data-meg-scroll-region="true"/);

assert.match(gateway, /runPhoenixSimpleEventWrite/);
assert.match(gateway, /runPhoenixBenefitEventWrite/);
assert.match(gateway, /runPhoenixCardPurchaseWrite/);
assert.match(gateway, /runPhoenixTransferWrite/);
assert.match(gateway, /runPhoenixSimpleEventEdit/);
assert.match(gateway, /runPhoenixBenefitEventEdit/);
assert.match(gateway, /runPhoenixCardPurchaseEdit/);
assert.match(gateway, /runPhoenixSimpleEventArchive/);
assert.match(gateway, /runPhoenixCardPurchaseCancel/);
assert.match(gateway, /canonicalBenefitAccountId/);
assert.match(gateway, /canonicalBenefitPaymentId/);
assert.match(gateway, /cardDueDateForPurchase/);
assert.match(gateway, /POSSIBLE_DUPLICATE/);

assert.match(css, /\.mnx-editor[\s\S]*grid-template-rows:auto minmax\(0,1fr\) auto/);
assert.match(css, /\.mnx-editor-body[\s\S]*overflow-y:auto[\s\S]*overflow-x:hidden/);
assert.match(css, /scrollbar-color:rgba\(73,240,223/);
assert.match(css, /@media \(max-width:900px\)/);
assert.match(css, /@media \(max-width:560px\)/);
assert.doesNotMatch(css, /overflow-x:\s*auto/);

assert.match(app, /WebNextMovementEditor/);
assert.match(app, /webNextEditRequest/);
assert.match(app, /onLaunchConsumed=\{\(\) => setLaunchRequest\(0\)\}/);
assert.match(app, /onEditConsumed=\{\(\) => setWebNextEditRequest\(null\)\}/);

const combined = editor + css;
assert.doesNotMatch(combined, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Editor visual Web Next não pode herdar nomenclatura visual Phoenix.');
assert.doesNotMatch(editor, /phoenix-launch\.css|PhoenixLaunchWriteControl/,
  'Editor Web Next não pode importar o host visual Phoenix.');
assert.match(gateway, /\.\.\/\.\.\/phoenix\/data\/phoenix-write-gateway/,
  'Regras financeiras existentes devem entrar somente pela fronteira data/.');

console.log('Web Next movement editor contract: OK');
