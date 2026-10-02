import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const editor = readFileSync(join(here, 'components/WebNextLaunchEditor.tsx'), 'utf8');
const css = readFileSync(join(here, 'styles/launch-editor.css'), 'utf8');
const movements = readFileSync(join(here, '../phoenix/screens/PhoenixMovementsV15.tsx'), 'utf8');
const writer = readFileSync(join(here, '../phoenix/components/PhoenixLaunchWriteControl.tsx'), 'utf8');

assert.match(editor, /data-web-next-overlay="launch-editor"/);
assert.match(editor, /Registrar movimento/);
assert.match(editor, /Despesa[\s\S]*Receita[\s\S]*Transferência/);
assert.match(editor, /Benefício Alimentação/);
assert.match(editor, /Conta de origem/);
assert.match(editor, /Conta de destino/);
assert.match(editor, /Forma de pagamento/);
assert.match(editor, /Compra no cartão/);
assert.match(editor, /Quantidade de parcelas/);
assert.match(editor, /Visualizar parcelas/);
assert.match(editor, /Lançamento recorrente/);
assert.match(editor, /Salvar como modelo/);
assert.match(editor, /Resumo[\s\S]*Antes de confirmar/);
assert.match(editor, /Descartar alterações/);
assert.match(editor, /BAIXA DE PENDÊNCIA/);
assert.match(editor, /EXCLUIR LANÇAMENTO/);

assert.match(css, /\.mnx-launch-editor-body[\s\S]*overflow-y:auto/);
assert.match(css, /scrollbar-color:rgba\(73,240,223/);
assert.match(css, /\.mnx-launch-editor[\s\S]*grid-template-rows:auto minmax\(0,1fr\) auto/);
assert.match(css, /@media \(max-width:780px\)/);
assert.match(css, /@media \(max-width:520px\)/);

assert.match(movements, /import \{ WebNextLaunchEditor \}/);
assert.match(movements, /launchOpen \? editorOnly \? <WebNextLaunchEditor/);
assert.match(movements, /writeControl=\{editingEventId \? null : renderLaunchWriteControl\('web-next'\)\}/);
assert.match(movements, /transferWriteInput/);
assert.match(movements, /transferInput=\{transferWriteInput\}/);
assert.match(movements, /!editorOnly && installmentPreviewOpen/);
assert.match(movements, /!editorOnly && discardConfirmOpen/);
assert.match(movements, /!editorOnly && settlementConfirmOpen/);
assert.match(movements, /!editorOnly && deleteConfirmOpen/);

assert.match(writer, /surface\?: 'phoenix' \| 'web-next'/);
assert.match(writer, /mnx-launch-write-panel/);
assert.match(writer, /surfaceClass/);
assert.match(writer, /transferInput \|\| readTransferInputFromDrawer/);

assert.doesNotMatch(editor + css, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Editor Web Next não pode herdar classes ou nomenclatura visual Phoenix.');

console.log('Web Next Launch Editor contract: OK');
