const SAVE_TIMEOUT_MS = 1400;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clearMegSession() {
  const keys = [];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith('meg-access-token') || key?.startsWith('meg-refresh-token') || key?.startsWith('meg-auth-user')) keys.push(key);
  }
  keys.forEach((key) => sessionStorage.removeItem(key));
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('meg-access-token') || key.startsWith('meg-refresh-token') || key.startsWith('meg-auth-user')) localStorage.removeItem(key);
  });
}

async function saveWithDeadline() {
  const state = window.MEG_APP?.getState?.();
  if (!state || typeof window.MEG_CLOUD?.saveNow !== 'function') return;
  await Promise.race([
    window.MEG_CLOUD.saveNow(structuredClone(state)).catch(() => undefined),
    wait(SAVE_TIMEOUT_MS),
  ]);
}

async function performFastLogout(button) {
  if (button.dataset.megLogoutRunning === '1') return;
  const confirmed = window.confirm('Deseja sair do MEG Finanças? As alterações serão salvas antes de retornar ao login.');
  if (!confirmed) return;

  button.dataset.megLogoutRunning = '1';
  button.disabled = true;
  button.textContent = 'Saindo...';
  const status = document.querySelector('#cloudSyncStatus');
  if (status) status.textContent = 'Salvando alterações...';

  try {
    await saveWithDeadline();
  } finally {
    clearMegSession();
    location.replace(location.pathname + location.search);
  }
}

function bindFastLogout() {
  const button = document.querySelector('#logoutBtn');
  if (!button || button.dataset.megFastLogout === '1') return;
  button.dataset.megFastLogout = '1';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    performFastLogout(button);
  }, { capture: true });
}

function start() {
  bindFastLogout();
  new MutationObserver(bindFastLogout).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
