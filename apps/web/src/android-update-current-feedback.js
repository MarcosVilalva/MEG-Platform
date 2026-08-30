const BUTTON_SELECTOR = '#checkAppUpdateBtn';
const FEEDBACK_ID = 'appUpdateCurrentFeedback';
const CHECK_TIMEOUT_MS = 30000;
const FEEDBACK_DURATION_MS = 4500;

let resetTimer = null;

function isSuccessfulCurrentState() {
  if (navigator.onLine === false) return false;
  if (document.querySelector('#appUpdateBanner, #appUpdateDialog, #appUpdateCheckWarning')) return false;
  if (window.MEG_AVAILABLE_APP_UPDATE) return false;
  return Boolean(document.body?.dataset?.installedAppVersion || window.MEG_INSTALLED_APP_VERSION?.versionName);
}

function currentVersionName() {
  return String(
    document.body?.dataset?.installedAppVersion
      || window.MEG_INSTALLED_APP_VERSION?.versionName
      || ''
  ).trim();
}

function clearFeedback() {
  document.querySelector(`#${FEEDBACK_ID}`)?.remove();
  if (resetTimer) window.clearTimeout(resetTimer);
  resetTimer = null;
}

function showCurrentVersionFeedback(button) {
  if (!button || !isSuccessfulCurrentState()) return;

  clearFeedback();
  const version = currentVersionName();
  const feedback = document.createElement('div');
  feedback.id = FEEDBACK_ID;
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  feedback.textContent = version
    ? `Você já está usando a versão mais recente do MEG, APK v${version}.`
    : 'Você já está usando a versão mais recente do MEG.';
  Object.assign(feedback.style, {
    marginTop: '8px',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid rgba(108, 225, 199, 0.35)',
    background: 'rgba(27, 112, 94, 0.22)',
    color: 'inherit',
    fontSize: '0.82rem',
    fontWeight: '700',
    lineHeight: '1.35',
    textAlign: 'center',
  });
  button.insertAdjacentElement('afterend', feedback);

  button.dataset.currentVersionFeedback = 'true';
  button.textContent = 'Última versão instalada';

  resetTimer = window.setTimeout(() => {
    feedback.remove();
    if (button.dataset.currentVersionFeedback === 'true') {
      delete button.dataset.currentVersionFeedback;
      button.textContent = 'Verificar atualização';
    }
    resetTimer = null;
  }, FEEDBACK_DURATION_MS);
}

function waitForManualCheckToFinish(button) {
  const startedAt = Date.now();
  let sawCheckingState = button.disabled || /verificando/i.test(button.textContent || '');

  const inspect = () => {
    sawCheckingState ||= button.disabled || /verificando/i.test(button.textContent || '');
    const finished = sawCheckingState && !button.disabled && !/verificando/i.test(button.textContent || '');
    if (finished) {
      window.setTimeout(() => showCurrentVersionFeedback(button), 0);
      return true;
    }
    return Date.now() - startedAt >= CHECK_TIMEOUT_MS;
  };

  if (inspect()) return;

  const observer = new MutationObserver(() => {
    if (!inspect()) return;
    observer.disconnect();
  });
  observer.observe(button, { attributes: true, childList: true, subtree: true, characterData: true });

  window.setTimeout(() => observer.disconnect(), CHECK_TIMEOUT_MS + 250);
}

function handleClick(event) {
  const button = event.target?.closest?.(BUTTON_SELECTOR);
  if (!button) return;
  clearFeedback();
  delete button.dataset.currentVersionFeedback;
  window.setTimeout(() => waitForManualCheckToFinish(button), 0);
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', handleClick);
}
