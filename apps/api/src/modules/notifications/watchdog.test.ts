import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alexaCycleForSlot, messagingCycleForSlot, notificationWatchdogPlan } from './watchdog';

function keys(value: Date) {
  return notificationWatchdogPlan(value).cycles.map((cycle) => `${cycle.kind}:${cycle.slot}:${cycle.task}`);
}

// Quarta-feira, 23/09/2026. São Paulo = UTC-3.
assert.deepEqual(keys(new Date('2026-09-23T09:02:00Z')), [
  'messaging:06:00:daily-summary',
], '06:02 BRT deve recuperar o resumo das 06h sem antecipar a Alexa das 06:20.');

assert.deepEqual(keys(new Date('2026-09-23T09:22:00Z')), [
  'messaging:06:00:daily-summary',
  'alexa:06:20:alexa-daily-briefing',
], '06:22 BRT deve manter o resumo em janela de recuperação e liberar o briefing Alexa.');

assert.deepEqual(keys(new Date('2026-09-23T15:02:00Z')), [
  'messaging:12:00:due-now',
], '12:02 BRT deve processar o ciclo de meio-dia.');

assert.deepEqual(keys(new Date('2026-09-23T21:02:00Z')), [
  'alexa:18:00:alexa-due',
], '18:02 BRT deve recuperar o anúncio Alexa do início da noite.');

assert.deepEqual(keys(new Date('2026-09-23T22:02:00Z')), [
  'messaging:19:00:due-now',
  'alexa:18:00:alexa-due',
], '19:02 BRT deve executar o alerta das 19h e ainda recuperar a Alexa das 18h.');

assert.deepEqual(keys(new Date('2026-09-24T00:02:00Z')), [
  'alexa:21:00:alexa-due',
], '00:02 UTC ainda é 21:02 do dia anterior em São Paulo e deve recuperar a Alexa das 21h.');

assert.deepEqual(keys(new Date('2026-09-26T15:02:00Z')), [
  'messaging:12:00:due-now',
  'alexa:12:00:alexa-daily-briefing',
], 'Fim de semana deve concentrar o briefing Alexa ao meio-dia sem perder o alerta monetário.');

assert.deepEqual(keys(new Date('2026-09-23T19:00:00Z')), [],
  '16:00 BRT não deve ressuscitar ciclos antigos fora da janela de recuperação.');

assert.equal(messagingCycleForSlot('06:00')?.task, 'daily-summary');
assert.equal(messagingCycleForSlot('12:00')?.task, 'due-now');
assert.equal(messagingCycleForSlot('19:00')?.task, 'due-now');
assert.equal(messagingCycleForSlot('07:00'), null);

assert.equal(alexaCycleForSlot(new Date('2026-09-23T12:00:00Z'), '06:20')?.task, 'alexa-daily-briefing');
assert.equal(alexaCycleForSlot(new Date('2026-09-26T15:00:00Z'), '12:00')?.task, 'alexa-daily-briefing');
assert.equal(alexaCycleForSlot(new Date('2026-09-26T15:00:00Z'), '18:00'), null);

console.log('notification watchdog scheduling tests passed');


const availabilityWorkflow = readFileSync(new URL('../../../../../.github/workflows/keep-api-responsive.yml', import.meta.url), 'utf8');
const smartWorkflow = readFileSync(new URL('../../../../../.github/workflows/daily-notifications.yml', import.meta.url), 'utf8');
const alexaWorkflow = readFileSync(new URL('../../../../../.github/workflows/alexa-reminders.yml', import.meta.url), 'utf8');

assert.match(availabilityWorkflow, /\/notifications\/watchdog/,
  'Workflow de disponibilidade deve executar o recovery watchdog a cada janela.');
assert.match(availabilityWorkflow, /12,22,32,42,52 9-23/,
  'Watchdog deve usar várias oportunidades por hora e evitar o minuto zero.');
assert.match(smartWorkflow, /cron: '7 9 \* \* \*'/,
  'Alerta financeiro primário deve sair do topo da hora.');
assert.match(alexaWorkflow, /cron: '21 9 \* \* 1-5'/,
  'Briefing Alexa deve ter tentativa primária após 06:20 e fora do topo da hora.');
