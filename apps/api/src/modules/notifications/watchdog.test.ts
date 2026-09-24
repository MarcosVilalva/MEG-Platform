import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alexaCycleForSlot, messagingCycleForSlot, notificationCycleIsActive, notificationWatchdogHealth, notificationWatchdogPlan } from './watchdog';

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
  'messaging:19:00:due-now',
  'alexa:21:00:alexa-due',
], '00:02 UTC ainda é 21:02 do dia anterior em São Paulo e deve recuperar tanto o ciclo das 19h quanto a Alexa das 21h.');

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

const weekdayEveningCycle = alexaCycleForSlot(new Date('2026-09-23T21:05:00Z'), '18:00')!;
assert.equal(notificationCycleIsActive(new Date('2026-09-23T21:05:00Z'), weekdayEveningCycle), true,
  '18:05 BRT deve estar dentro da janela do ciclo das 18h.');
assert.equal(notificationCycleIsActive(new Date('2026-09-24T04:38:00Z'), weekdayEveningCycle), false,
  'Cron atrasado para 01:38 BRT jamais pode fingir um ciclo das 18h/21h.');


const beforeFirstCycle = notificationWatchdogHealth([], new Date('2026-09-24T08:00:00Z'));
assert.equal(beforeFirstCycle.status, 'waiting',
  'Antes da primeira janela diária a ausência de marcador não deve gerar alarme falso.');

const missingMorning = notificationWatchdogHealth([], new Date('2026-09-24T09:40:00Z'));
assert.equal(missingMorning.status, 'attention',
  'Após a tolerância do ciclo das 06h, ausência de marcador deve aparecer como atenção.');
assert.equal(missingMorning.expected[0]?.slot, '06:00');
assert.equal(missingMorning.expected[0]?.state, 'missing');

const healthyMorning = notificationWatchdogHealth([
  {
    channel: 'watchdog:notifications',
    reference: '2026-09-24:06:00:daily-summary',
    status: 'sent',
    deliveredAt: new Date('2026-09-24T09:17:10Z'),
  },
], new Date('2026-09-24T09:40:00Z'));
assert.equal(healthyMorning.status, 'ok');
assert.equal(healthyMorning.expected[0]?.state, 'ok');

const staleProcessing = notificationWatchdogHealth([
  {
    channel: 'watchdog:notifications',
    reference: '2026-09-24:06:00:daily-summary',
    status: 'processing',
    deliveredAt: new Date('2026-09-24T09:15:00Z'),
  },
], new Date('2026-09-24T09:40:00Z'));
assert.equal(staleProcessing.status, 'attention');
assert.equal(staleProcessing.expected[0]?.state, 'stale');

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


const notificationRoutes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
assert.match(notificationRoutes, /app\.post\('\/watchdog'/,
  'API deve expor endpoint autenticado por segredo para recuperação dos ciclos.');
assert.match(notificationRoutes, /runMessagingCycle/,
  'Cron principal e watchdog devem compartilhar a mesma trava idempotente de ciclo.');
assert.match(notificationRoutes, /runAlexaCycle/,
  'Cron Alexa e watchdog devem compartilhar a mesma trava idempotente de ciclo.');
assert.match(notificationRoutes, /!item\.channel\.startsWith\('watchdog:'\)/,
  'Marcadores internos do watchdog não podem inflar a contagem de mensagens entregues ao usuário.');


const apiConfig = readFileSync(new URL('../../config.ts', import.meta.url), 'utf8');
assert.match(apiConfig, /NOTIFICATION_WATCHDOG_SECRET/,
  'Failsafe externo deve usar segredo próprio sem compartilhar a credencial principal do cron.');
assert.match(notificationRoutes, /x-watchdog-secret/,
  'Endpoint de recovery deve aceitar a credencial isolada do scheduler secundário.');
assert.match(notificationRoutes, /authorizedByCron[\s\S]*authorizedByWatchdog/,
  'GitHub deve continuar autorizado enquanto o scheduler secundário usa segredo independente.');


const supabaseFailsafeSql = readFileSync(new URL('../../../../../ops/supabase/notification-watchdog-failsafe.sql', import.meta.url), 'utf8');
assert.match(supabaseFailsafeSql, /meg-notification-watchdog-backup-day/,
  'Failsafe Supabase deve ficar versionado no repositório.');
assert.match(supabaseFailsafeSql, /17,27,37,47,57 9-23/,
  'Scheduler secundário deve usar minutos diferentes do watchdog GitHub.');
assert.match(supabaseFailsafeSql, /revoke all on function public\.meg_run_notification_watchdog\(\) from anon/,
  'Função de failsafe não pode permanecer exposta ao papel anon.');
assert.doesNotMatch(supabaseFailsafeSql, /kSliamhUddM0GwS12zp40bYOwLo0ZQ49/,
  'Segredos reais jamais podem ser versionados no SQL operacional.');


assert.match(smartWorkflow, /Scheduled pulse: watchdog decides/,
  'Execução agendada de mensagens deve delegar o relógio real ao watchdog.');
assert.match(smartWorkflow, /\/notifications\/watchdog/,
  'Cron agendado não deve criar marcador futuro a partir de slot nominal atrasado.');
assert.match(alexaWorkflow, /Scheduled Alexa pulse: watchdog uses the real São Paulo clock/,
  'Alexa agendada deve obedecer o relógio real do watchdog quando o GitHub atrasar.');
assert.match(alexaWorkflow, /\/notifications\/watchdog/,
  'Alexa agendada deve usar o watchdog em vez de executar slot futuro diretamente.');
assert.match(notificationRoutes, /!body\.force && !notificationCycleIsActive\(now, cycle\)/,
  'API deve rejeitar crons automáticos fora da janela, mesmo que um workflow antigo ainda os invoque.');
