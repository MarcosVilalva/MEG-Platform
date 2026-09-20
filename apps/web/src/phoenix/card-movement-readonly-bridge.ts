let observer: MutationObserver | null = null;
let scheduled = false;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function detailDrawer() {
  return document.querySelector<HTMLElement>('.px-detail-drawer.open');
}

function detailValue(root: HTMLElement, label: string) {
  const target = normalize(label);
  const item = [...root.querySelectorAll<HTMLElement>('.px-detail-grid > div')]
    .find((node) => normalize(node.querySelector('span')?.textContent || '') === target);
  return item?.querySelector('strong')?.textContent || '';
}

function isProjectedCardMovement(root: HTMLElement) {
  const modality = normalize(detailValue(root, 'Modalidade'));
  const notices = normalize([...root.querySelectorAll<HTMLElement>('.px-notice')].map((node) => node.textContent || '').join(' '));
  return modality === 'CREDITO' && notices.includes('DOMINIO DE CARTOES/FATURAS');
}

function protectionNotice(root: HTMLElement) {
  let node = root.querySelector<HTMLElement>('[data-phoenix-card-readonly-notice]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.phoenixCardReadonlyNotice = 'true';
    node.className = 'px-notice ok';
    const actions = root.querySelector('.px-detail-actions');
    actions?.parentElement?.insertBefore(node, actions);
  }
  return node;
}

function protect(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('.px-detail-actions .px-primary-action:not([data-card-domain-edit])');
  if (button) {
    button.dataset.phoenixCardDomainEdit = 'true';
    button.disabled = true;
    button.hidden = true;
    button.textContent = 'Editar pela área de Cartões';
    button.title = 'Esta compra pertence ao domínio de cartões/faturas. O editor financeiro genérico foi bloqueado para evitar duplicidade.';
  }

  const genericDelete = root.querySelector<HTMLButtonElement>('[data-phoenix-generic-delete]');
  if (genericDelete) {
    genericDelete.hidden = true;
    genericDelete.disabled = true;
    genericDelete.title = 'Compras no cartão são excluídas pelo fluxo próprio de cartões/faturas.';
  }

  const cancel = root.querySelector<HTMLButtonElement>('[data-card-domain-cancel]');
  if (cancel) {
    cancel.textContent = 'Excluir compra';
    cancel.title = 'Remove as parcelas abertas das faturas e preserva o histórico de auditoria.';
  }

  protectionNotice(root).textContent = 'Compra vinculada ao domínio de cartões/faturas. Use as ações próprias do cartão para editar ou excluir sem duplicar movimentação financeira.';
}

function restore(root: HTMLElement) {
  root.querySelector('[data-phoenix-card-readonly-notice]')?.remove();
  const genericDelete = root.querySelector<HTMLButtonElement>('[data-phoenix-generic-delete]');
  if (genericDelete) {
    genericDelete.hidden = false;
    genericDelete.disabled = false;
    genericDelete.removeAttribute('title');
  }
  const button = root.querySelector<HTMLButtonElement>('[data-phoenix-card-domain-edit]');
  if (!button) return;
  delete button.dataset.phoenixCardDomainEdit;
  button.hidden = false;
  button.disabled = false;
  button.textContent = 'Editar lançamento';
  button.removeAttribute('title');
}

function sync() {
  scheduled = false;
  const root = detailDrawer();
  if (!root) return;
  if (isProjectedCardMovement(root)) protect(root);
  else restore(root);
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(sync, 0);
}

function blockGenericCardEdit(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('[data-phoenix-card-domain-edit]')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function start() {
  document.addEventListener('click', blockGenericCardEdit, true);
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardMovementReadonlyBridge() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', blockGenericCardEdit, true);
}
