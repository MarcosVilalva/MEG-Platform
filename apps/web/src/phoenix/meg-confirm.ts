export type MegConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  kicker?: string;
};

let activeLayer: HTMLElement | null = null;
let activeResolve: ((value: boolean) => void) | null = null;

function finish(value: boolean) {
  const resolve = activeResolve;
  activeResolve = null;
  activeLayer?.remove();
  activeLayer = null;
  resolve?.(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function megConfirm(options: MegConfirmOptions): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  if (activeLayer) finish(false);

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const layer = document.createElement('div');
  layer.className = 'px-meg-confirm-overlay px-global-confirm-overlay';
  layer.dataset.megPriorityLayer = 'critical-confirm';
  layer.innerHTML = `
    <button class="px-meg-confirm-backdrop" type="button" aria-label="${escapeHtml(options.cancelLabel || 'Cancelar')}"></button>
    <section class="px-meg-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="px-global-confirm-title">
      <div class="px-meg-confirm-icon" aria-hidden="true">!</div>
      <div class="px-meg-confirm-copy">
        <span class="px-kicker">${escapeHtml(options.kicker || 'Confirmação')}</span>
        <h3 id="px-global-confirm-title">${escapeHtml(options.title)}</h3>
        <p>${escapeHtml(options.message)}</p>
      </div>
      <button class="px-meg-confirm-close" type="button" aria-label="${escapeHtml(options.cancelLabel || 'Cancelar')}">×</button>
      <div class="px-meg-confirm-actions">
        <button class="px-meg-confirm-secondary" type="button" data-meg-confirm-cancel>${escapeHtml(options.cancelLabel || 'Cancelar')}</button>
        <button class="${options.danger ? 'px-meg-confirm-danger' : 'px-primary-action'}" type="button" data-meg-confirm-ok>${escapeHtml(options.confirmLabel || 'Confirmar')}</button>
      </div>
    </section>
  `;

  const close = (value: boolean) => {
    document.removeEventListener('keydown', onKeydown, true);
    finish(value);
    window.setTimeout(() => previousFocus?.focus(), 0);
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close(false);
  };

  layer.querySelector('[data-meg-confirm-ok]')?.addEventListener('click', () => close(true));
  layer.querySelector('[data-meg-confirm-cancel]')?.addEventListener('click', () => close(false));
  layer.querySelector('.px-meg-confirm-close')?.addEventListener('click', () => close(false));
  layer.querySelector('.px-meg-confirm-backdrop')?.addEventListener('click', () => close(false));
  document.addEventListener('keydown', onKeydown, true);
  document.body.append(layer);
  activeLayer = layer;

  window.requestAnimationFrame(() => layer.querySelector<HTMLButtonElement>('[data-meg-confirm-ok]')?.focus());
  return new Promise<boolean>((resolve) => { activeResolve = resolve; });
}
