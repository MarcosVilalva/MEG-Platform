import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const launcher=readFileSync(join(here,'components/WebNextLaunchSelector.tsx'),'utf8');
const css=readFileSync(join(here,'styles/launcher.css'),'utf8');
const shell=readFileSync(join(here,'app/WebNextShell.tsx'),'utf8');
const app=readFileSync(join(here,'../phoenix/PhoenixApp.tsx'),'utf8');
const movements=readFileSync(join(here,'../phoenix/screens/PhoenixMovementsV15.tsx'),'utf8');

assert.match(launcher,/Despesa[\s\S]*Receita[\s\S]*Alimentação/);
assert.match(launcher,/select\('expense'\)/);
assert.match(launcher,/select\('income'\)/);
assert.match(launcher,/select\('benefit'\)/);
assert.match(launcher,/Usa o benefício Verocard/);
assert.match(shell,/onSelect=\{onLaunch\}/);
assert.match(app,/onLaunch=\{requestLaunch\}/);
assert.match(app,/type LaunchPreset = 'expense' \| 'income' \| 'benefit'/);
assert.match(movements,/launchPreset === 'benefit'/);
assert.match(movements,/canonicalBenefitAccount/);
assert.match(movements,/canonicalVerocardPayment/);
assert.match(css,/mnx-launch-option\.is-expense/);
assert.match(css,/mnx-launch-option\.is-income/);
assert.match(css,/mnx-launch-option\.is-benefit/);
assert.doesNotMatch(launcher+css,/\bpx-|phoenix-v|fidelity-v|revolution/i);

console.log('Web Next launcher contract: OK');
