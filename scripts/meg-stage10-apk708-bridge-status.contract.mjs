/**
 * Caracterizacao somente leitura de incompatibilidade entre bridge de Novo
 * Lancamento e writer Phoenix empacotados no build Android run #708.
 * Sem tocar APK, API, banco ou codigo-fonte do Android.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const SHA = '36c886b9597be95a28eb2add00f073e5f43f6fe0';
function get(path) {
  return execFileSync('git', ['show', SHA + ':' + path],
    { encoding: 'utf8', timeout: 20_000, maxBuffer: 2 * 1024 * 1024 });
}

const main = get('apps/web/src/app/main.tsx');
const bridge = get('apps/web/src/phoenix/simple-event-form-bridge.ts');
const gateway = get('apps/web/src/phoenix/data/phoenix-write-gateway.ts');

assert.ok(main.includes("import '../phoenix/simple-event-form-bridge'"),
  'Bridge carregado no bootstrap da APK');
assert.ok(bridge.includes('void submit(root)'), 'Clique do drawer chama submit');
assert.ok(bridge.includes('if (editing || cardFlow) return;'),
  'Escopo do bridge restringe edicao e cartao');

for (const method of ['runPhoenixBenefitEventWrite', 'runPhoenixSimpleEventWrite']) {
  assert.ok(bridge.includes('await ' + method + '('),
    'Bridge chama ' + method);
}

const rejectedSuccess = "if (result.status !== 'confirmed') throw new Error('PHOENIX_WRITE_NOT_CONFIRMED')";
assert.ok(bridge.includes(rejectedSuccess),
  'Bridge exige confirmacao sincronizada sem aceitar accepted');

for (const [functionName, nextFunction] of [
  ['runPhoenixSimpleEventWrite', 'runPhoenixBenefitEventWrite'],
  ['runPhoenixBenefitEventWrite', 'runPhoenixCardPurchaseWrite'],
]) {
  const begin = gateway.indexOf('export async function ' + functionName + '(');
  const end = gateway.indexOf('export async function ' + nextFunction + '(', begin+1);
  assert.ok(begin >= 0 && end > begin, functionName + ' localizada');
  const code = gateway.slice(begin,end);
  assert.ok(code.includes("status: 'accepted'"), functionName + ' emite accepted');
  assert.ok(code.includes('return accepted;'), functionName + ' retorna accepted antes de callback');
  assert.ok(code.includes("onState?.({ status: 'confirmed'"), functionName + ' confirma por callback');
}

assert.ok(!bridge.includes('runPhoenixSimpleEventWrite(prepared,'),
  'Divergencia original usa assinatura com argumentos tipados/cast, rever assert');

console.log('MEG_STAGE10_APK708_BRIDGE_ACCEPTED_CONFIRMED_MISMATCH=DETECTED');
console.log('MEG_STAGE10_APK708_BRIDGE_SCOPE_SIMPLE_AND_BENEFIT=CHARACTERIZED');
console.log('MEG_STAGE10_APK708_NO_PHYSICAL_EXECUTION_AND_NO_ANDROID_CHANGE=PASS');
