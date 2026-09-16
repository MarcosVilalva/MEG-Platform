type DataInvalidatedDetail = {
  path?: string;
  method?: string;
};

let closeTimer: number | null = null;

function isLaunchMutation(detail: DataInvalidatedDetail | undefined) {
  const method = String(detail?.method || '').toUpperCase();
  const path = String(detail?.path || '');
  return ['POST', 'PUT', 'PATCH'].includes(method)
    && (
      path.startsWith('/finance/events')
      || path.startsWith('/cards/purchases')
      || path.startsWith('/finance/transfers')
      || path.startsWith('/payables/recurring')
    );
}

function confirmedLaunchDrawer() {
  return document.querySelector<HTMLElement>('.px-launch-drawer');
}

function lockConfirmedDrawer(root: HTMLElement) {
  root.dataset.megWriteConfirmed = 'true';
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (button) {
    button.disabled = true;
    button.textContent = 'Salvo · sincronizando…';
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

  // O writer só emite meg:data-invalidated depois de receber a confirmação do servidor.
  // Portanto, neste ponto a operação já está persistida na nuvem e o formulário local
  // pode ser encerrado sem pedir uma segunda confirmação ao usuário.
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

  // Os writers atuais publicam este evento em window. Mantemos um pequeno intervalo
  // apenas para a UI refletir a confirmação/sincronização antes de fechar o drawer.
  closeTimer = window.setTimeout(() => forceCloseConfirmedDrawer(root), 180);
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

window.addEventListener('meg:data-invalidated', onDataInvalidated as EventListener);
document.addEventListener('click', blockPostConfirmationSubmit, true);

export function stopPhoenixWriteSuccessAutoClose() {
  resetTimer();
  window.removeEventListener('meg:data-invalidated', onDataInvalidated as EventListener);
  document.removeEventListener('click', blockPostConfirmationSubmit, true);
}
