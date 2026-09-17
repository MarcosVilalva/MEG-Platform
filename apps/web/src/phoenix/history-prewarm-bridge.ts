import { readSession } from '../app/auth-client';
import { loadPhoenixAllEvents } from './data/load-phoenix-read-model';

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout: number }
  ) => number;
};

let sessionTimer: number | null = null;
let retryTimer: number | null = null;
let started = false;

function scheduleWarmHistory() {
  if (started) return;
  if (!readSession()) {
    sessionTimer = window.setTimeout(scheduleWarmHistory, 200);
    return;
  }

  started = true;
  if (sessionTimer !== null) {
    window.clearTimeout(sessionTimer);
    sessionTimer = null;
  }

  const run = () => {
    void loadPhoenixAllEvents().catch(() => {
      // A pré-carga nunca bloqueia o sistema. Em falha transitória, tenta novamente
      // em segundo plano para que o autocomplete não precise pagar esse custo depois.
      started = false;
      retryTimer = window.setTimeout(scheduleWarmHistory, 1800);
    });
  };

  const idle = (window as IdleWindow).requestIdleCallback;
  if (idle) {
    idle(run, { timeout: 350 });
    return;
  }
  window.setTimeout(run, 120);
}

function start() {
  scheduleWarmHistory();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixHistoryPrewarm() {
  if (sessionTimer !== null) window.clearTimeout(sessionTimer);
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  sessionTimer = null;
  retryTimer = null;
  started = false;
}
