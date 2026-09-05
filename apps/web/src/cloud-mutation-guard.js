const MUTATION_CONTROL_SELECTOR = [
  'button[type="submit"]',
  'input[type="submit"]',
  '[data-toggle-paid]',
  '[data-toggle-paid-group]',
  '[data-save-budget]',
  '[data-remove-group]',
  '[data-remove-payment]',
  '[data-remove-expense-class]',
  '[data-remove-modality]',
  '[data-remove-card]',
  '[data-remove-financial-account]',
  '[data-remove-recipient]',
  '[data-remove-email-recipient]',
  '[data-toggle-card]',
  '[data-toggle-financial-account]',
  '[data-toggle-group]',
  '[data-toggle-expense-class]',
  '[data-toggle-modality]',
  '[data-toggle-payment]',
  '[data-user-action]',
  '[data-save-user-role]',
  '[data-reset-user-password]',
  '[data-delete-managed-user]',
  '[data-license-action]',
  '[data-create-invoice]',
  '[data-invoice-action]',
  '#markAllPendingPaidBtn',
  '#applySuggestedBudgetsBtn',
  '#addRecipientBtn',
  '#addEmailRecipientBtn',
  '#sendNotificationsBtn',
  '#testWorkspaceWhatsappBtn',
  '#closeDialogBtn',
  '#cancelDialogBtn',
  '#transactionBatchApply',
  '#transactionBatchClear',
  '#transactionSelectVisible',
  '.transaction-select-checkbox',
  '.meg-mobile-transaction-select input',
  '#xlsxImport',
  '#csvImport',
  '#backupImport',
].join(',');

let networkWrites = 0;
let installed = false;

function dispatch(name, detail = {}) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

function setVisualPending(active) {
  document.body?.classList?.toggle('meg-cloud-mutation-pending', active);
}

function hasAuthenticatedSession() {
  return Boolean(window.sessionStorage?.getItem?.('meg-access-token'));
}

function requestDetails(input, init = {}) {
  try {
    const request = typeof Request === 'function' && input instanceof Request ? input : null;
    const url = new URL(request?.url || String(input), location.href);
    const method = String(init.method || request?.method || 'GET').toUpperCase();
    return { url, method };
  } catch {
    return { url: null, method: 'GET' };
  }
}

function isAuthenticatedMutation(input, init) {
  const { url, method } = requestDetails(input, init);
  if (!url || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !hasAuthenticatedSession()) return false;
  if (/\/auth\/(login|register|refresh|logout)\/?$/i.test(url.pathname)) return false;
  return true;
}

function operationPending() {
  return networkWrites > 0 || Boolean(window.MEG_INSTANT_PERSISTENCE?.pending?.());
}

function blockRepeatedMutation(event) {
  if (!operationPending()) return;
  const control = event.target?.closest?.(MUTATION_CONTROL_SELECTOR);
  const mutatingForm = event.type === 'submit' && event.target?.matches?.('form:not([data-cloud-readonly])');
  if (!control && !mutatingForm) return;
  if (control?.closest?.('.auth-shell, .login-shell') || event.target?.closest?.('.auth-shell, .login-shell')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  dispatch('meg:cloud-action-blocked', { reason: 'previous-operation-pending' });
}

export function installCloudMutationGuard() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  if (!document.getElementById('megCloudMutationGuardStyles')) {
    const style = document.createElement('style');
    style.id = 'megCloudMutationGuardStyles';
    style.textContent = `body.meg-cloud-mutation-pending :is(${MUTATION_CONTROL_SELECTOR}){cursor:progress!important;filter:saturate(.72);opacity:.46!important;pointer-events:none!important}`;
    document.head.appendChild(style);
  }
  const previousFetch = window.fetch.bind(window);
  window.fetch = async function guardedCloudMutationFetch(input, init = {}) {
    if (!isAuthenticatedMutation(input, init)) return previousFetch(input, init);
    const { url, method } = requestDetails(input, init);
    networkWrites += 1;
    setVisualPending(true);
    dispatch('meg:cloud-action-started', { method, path: url?.pathname || '' });
    try {
      const response = await previousFetch(input, init);
      dispatch(response.ok ? 'meg:cloud-action-response-confirmed' : 'meg:cloud-action-failed', {
        method,
        path: url?.pathname || '',
        status: response.status,
      });
      return response;
    } catch (error) {
      dispatch('meg:cloud-action-failed', { method, path: url?.pathname || '', message: error?.message || String(error) });
      throw error;
    } finally {
      networkWrites = Math.max(0, networkWrites - 1);
      if (networkWrites === 0) {
        if (!window.MEG_INSTANT_PERSISTENCE?.pending?.()) setVisualPending(false);
        dispatch('meg:cloud-network-idle');
      }
    }
  };

  document.addEventListener('click', blockRepeatedMutation, true);
  document.addEventListener('submit', blockRepeatedMutation, true);
  document.addEventListener('change', blockRepeatedMutation, true);
  window.addEventListener('meg:cloud-save-confirmed', () => {
    if (networkWrites === 0 && !window.MEG_INSTANT_PERSISTENCE?.pending?.()) setVisualPending(false);
  });
  window.MEG_CLOUD_MUTATION_GUARD = { pending: operationPending, setVisualPending };
}
