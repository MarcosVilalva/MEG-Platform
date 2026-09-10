import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract = readFileSync(new URL('./meg-visual-contract.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(contract, /--meg-contract-sidebar/);
assert.match(contract, /\.app-shell\.sidebar-collapsed/);
assert.match(contract, /\.meg-command-bar/);
assert.match(contract, /\.table-wrap/);
assert.match(contract, /body\.native-mobile\.meg-layout-reformed \.mobile-dock/);
assert.match(contract, /overflow-x:\s*hidden/);
assert.ok(index.indexOf('meg-visual-contract.css') > index.indexOf('meg-design-system.css'));

console.log('Contrato visual MEG: prioridade, estrutura e adaptação preservadas.');
