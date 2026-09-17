import { authenticatedRequest, readSession } from '../app/auth-client';

let warmedKey = '';
let warmScheduled = false;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value || '2026';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  return `${year}-${month}`;
}

async function warmActionData() {
  const session = readSession();
  if (!session) return;
  const month = currentMonth();
  const key = `${session.user.id}:${month}`;
  if (key === warmedKey) return;
  warmedKey = key;
  const encodedMonth = encodeURIComponent(month);
  const paths = [
    '/finance/accounts',
    '/finance/categories',
    '/finance/payment-methods',
    `/cards?month=${encodedMonth}`,
    `/payables?month=${encodedMonth}`
  ];
  const result = await Promise.allSettled(paths.map((path) => authenticatedRequest(path)));
  if (result.every((item) => item.status === 'rejected')) warmedKey = '';
}

function scheduleWarm() {
  if (!readSession() || warmedKey || warmScheduled) return;
  warmScheduled = true;
  const run = () => {
    warmScheduled = false;
    void warmActionData();
  };
  const idle = (window as IdleWindow).requestIdleCallback;
  if (typeof idle === 'function') {
    idle.call(window, run, { timeout: 2500 });
  } else {
    globalThis.setTimeout(run, 1200);
  }
}

scheduleWarm();

const root = document.getElementById('root');
if (root) {
  new MutationObserver(() => {
    if (root.querySelector('.px-app')) scheduleWarm();
  }).observe(root, { childList: true, subtree: true });
}

window.addEventListener('focus', scheduleWarm);
