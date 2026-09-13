type DataInvalidatedDetail = {
  path?: string;
  method?: string;
};

let closeTimer: number | null = null;

function isLaunchMutation(detail: DataInvalidatedDetail | undefined) {
  const method = String(detail?.method || '').toUpperCase();
  const path = String(detail?.path || '');
  return ['POST', 'PUT', 'PATCH'].includes(method) && path.startsWith('/finance/events');
}

function confirmedLaunchDrawer() {
  return document.querySelector<HTMLElement>('.px-launch-drawer');
}

function lockConfirmedDrawer(root: HTMLElement) {
  root.dataset.megWriteConfirmed = 'true';
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (button) {
    button.disabled = true;
    button.textContent = 'Salvo · fechando…';
  }
}

function resetTimer() {
  if (closeTimer !== null) window.clearTimeout(closeTimer);
  closeTimer = null;
}

function forceCloseConfirmedDrawer(root: HTMLElement) {
  resetTimer();
  if (!root.isConnected) return;

  const close = root.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn');
  if (!close) return;

  // Depois da confirmação do servidor não há alterações locais a descartar.
  // O override existe apenas durante este clique para que o React execute
  // requestCloseLaunch(), que fecha e também reseta completamente o rascunho.
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    close.click();
  } finally {
    window.setTimeout(() => {
      window.confirm = originalConfirm;
    }, 0);
  }
}

function onDataInvalidated(event: Event) {
  const detail = (event as CustomEvent<DataInvalidatedDetail>).detail;
  if (!isLaunchMutation(detail)) return;

  const root = confirmedLaunchDrawer();
  if (!root) return;

  lockConfirmedDrawer(root);
  resetTimer();
  closeTimer = window.setTimeout(() => forceCloseConfirmedDrawer(root), 120);
}

function blockPostConfirmationSubmit(event: Event) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('.px-review-launch');
  if (!button) return;
  const root = button.closest<HTMLElement>('.px-launch-drawer');
  if (root?.dataset.megWriteConfirmed !== 'true') return;

  event.preventDefault();
  event.stopImmediatePropagation();
}

document.addEventListener('meg:data-invalidated', onDataInvalidated as EventListener);
document.addEventListener('click', blockPostConfirmationSubmit, true);

export function stopPhoenixWriteSuccessAutoClose() {
  resetTimer();
  document.removeEventListener('meg:data-invalidated', onDataInvalidated as EventListener);
  document.removeEventListener('click', blockPostConfirmationSubmit, true);
}
