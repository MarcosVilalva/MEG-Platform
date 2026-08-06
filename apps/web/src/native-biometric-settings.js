import {
  biometricUnavailableMessage,
  clearBiometricLogin,
  getBiometricLoginStatus,
  requestBiometricLogin,
  saveBiometricLogin,
} from './native-biometric-login.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
let settingsObserver = null;
let settingsTimer = null;
let mountAttempts = 0;
const BIOMETRIC_STATUS_TIMEOUT_MS = 15000;

function readableBiometricError(cause) {
  const reason = cause instanceof Error ? cause.message : String(cause || '');
  if (reason.includes('TIMEOUT')) {
    return 'O Android demorou para responder. Feche o MEG, abra novamente e tente ativar a biometria.';
  }
  return biometricUnavailableMessage(reason);
}

function withStatusTimeout(promise) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('BIOMETRIC_STATUS_TIMEOUT')), BIOMETRIC_STATUS_TIMEOUT_MS);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

function ensureStyles() {
  if (document.querySelector('#megBiometricSettingsStyles')) return;
  const style = document.createElement('style');
  style.id = 'megBiometricSettingsStyles';
  style.textContent = `
    .meg-biometric-settings-button {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
      margin: 8px 0; padding: 11px 13px; border: 1px solid #b9d9d2; border-radius: 12px;
      background: #eff8f5; color: #0b5f54; font: inherit; font-weight: 800; cursor: pointer;
    }
    .meg-biometric-settings-button[data-enabled="true"] { background: #e5f7ef; border-color: #8fd3b8; }
    .meg-biometric-settings-button:disabled { opacity: .7; cursor: wait; }
    .meg-biometric-settings-dialog { max-width: 420px; width: calc(100% - 32px); border: 0; border-radius: 18px; padding: 0; box-shadow: 0 24px 70px #0006; }
    .meg-biometric-settings-dialog::backdrop { background: #0f2926aa; backdrop-filter: blur(3px); }
    .meg-biometric-settings-card { display: grid; gap: 14px; padding: 22px; font-family: system-ui, sans-serif; }
    .meg-biometric-settings-card h2, .meg-biometric-settings-card p { margin: 0; }
    .meg-biometric-settings-card p { color: #526b66; line-height: 1.45; }
    .meg-biometric-settings-card label { display: grid; gap: 7px; font-weight: 750; color: #173d37; }
    .meg-biometric-settings-card input { width: 100%; box-sizing: border-box; padding: 13px; border: 1px solid #b8cbc7; border-radius: 11px; font: inherit; }
    .meg-biometric-settings-error { min-height: 20px; color: #a11b1b !important; font-weight: 700; }
    .meg-biometric-settings-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .meg-biometric-settings-actions button { padding: 11px 14px; border-radius: 10px; border: 1px solid #aec7c2; font: inherit; font-weight: 800; }
    .meg-biometric-settings-actions .primary { background: #0b6b5d; border-color: #0b6b5d; color: #fff; }
  `;
  document.head.appendChild(style);
}

async function verifyCurrentPassword(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error === 'INVALID_CREDENTIALS'
      ? 'Senha incorreta.'
      : 'Não foi possível validar a senha agora.';
    throw new Error(message);
  }
  return true;
}

function passwordDialog(email) {
  if (typeof HTMLDialogElement === 'undefined') {
    return Promise.resolve(window.prompt(`Confirme a senha de ${email} para ativar a biometria:`) || '');
  }

  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'meg-biometric-settings-dialog';
    dialog.innerHTML = `
      <form method="dialog" class="meg-biometric-settings-card">
        <div><h2>Ativar biometria</h2><p>Confirme sua senha uma vez. Depois o Android armazenará o acesso de forma criptografada neste aparelho.</p></div>
        <label>Conta<input value="${String(email).replaceAll('"', '&quot;')}" disabled /></label>
        <label>Senha<input name="password" type="password" autocomplete="current-password" minlength="8" required /></label>
        <p class="meg-biometric-settings-error" role="alert"></p>
        <div class="meg-biometric-settings-actions">
          <button value="cancel" type="button">Cancelar</button>
          <button class="primary" value="confirm" type="submit">Validar e ativar</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    const form = dialog.querySelector('form');
    const password = dialog.querySelector('[name="password"]');
    const cancel = dialog.querySelector('button[value="cancel"]');
    cancel.addEventListener('click', () => dialog.close('cancel'));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      dialog.close('confirm');
    });
    dialog.addEventListener('close', () => {
      const result = dialog.returnValue === 'confirm' ? password.value : '';
      password.value = '';
      dialog.remove();
      resolve(result);
    }, { once: true });
    dialog.showModal();
    password.focus();
  });
}

async function activateBiometric(button, statusText) {
  const user = window.MEG_CLOUD?.user;
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) throw new Error('Não foi possível identificar o e-mail conectado. Saia e entre novamente.');

  const password = await passwordDialog(email);
  if (!password) return false;

  button.disabled = true;
  statusText('Validando sua senha...');
  try {
    await verifyCurrentPassword(email, password);
    statusText('Confirme sua digital no Android...');
    const saved = await saveBiometricLogin({ email, password });
    if (!saved?.saved) throw new Error(biometricUnavailableMessage(saved?.reason));
    return true;
  } finally {
    button.disabled = false;
  }
}

async function mountSettingsButton() {
  const logoutButton = document.querySelector('#logoutBtn');
  if (!logoutButton || document.querySelector('#androidBiometricSettingsBtn')) return Boolean(logoutButton);
  ensureStyles();

  const button = document.createElement('button');
  button.id = 'androidBiometricSettingsBtn';
  button.type = 'button';
  button.className = 'meg-biometric-settings-button';
  button.textContent = 'Verificando biometria...';
  logoutButton.insertAdjacentElement('beforebegin', button);

  const updateButton = async () => {
    button.disabled = true;
    button.textContent = 'Verificando biometria...';
    try {
      const status = await withStatusTimeout(getBiometricLoginStatus());
      button.dataset.enabled = String(Boolean(status?.enabled));
      if (!status?.available) {
        button.textContent = 'Biometria indisponível';
        button.title = biometricUnavailableMessage(status?.reason);
        return status;
      }
      button.textContent = status.enabled ? 'Biometria ativa — testar' : 'Ativar biometria neste aparelho';
      button.title = status.enabled
        ? 'Toque para testar a leitura biométrica.'
        : 'Toque para vincular sua conta à biometria do Android.';
      return status;
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'PLUGIN_UNAVAILABLE';
      button.dataset.enabled = 'false';
      button.textContent = 'Tentar biometria novamente';
      button.title = reason === 'BIOMETRIC_STATUS_TIMEOUT'
        ? 'O Android não respondeu à verificação. Toque para tentar novamente.'
        : biometricUnavailableMessage(reason);
      return { available: false, enabled: false, reason };
    } finally {
      button.disabled = false;
    }
  };

  await updateButton();
  button.addEventListener('click', async () => {
    const originalText = button.textContent;
    const statusText = (message) => { button.textContent = message; };
    button.disabled = true;
    try {
      const status = await withStatusTimeout(getBiometricLoginStatus());
      if (!status?.available) {
        window.alert(status?.reason === 'BIOMETRIC_STATUS_TIMEOUT'
          ? 'O Android não respondeu à biometria. Verifique se há uma digital cadastrada no aparelho e tente novamente.'
          : biometricUnavailableMessage(status?.reason));
        return;
      }
      if (status.enabled) {
        statusText('Aguardando digital...');
        const credentials = await requestBiometricLogin();
        window.alert(credentials ? 'Biometria confirmada com sucesso.' : 'A leitura biométrica foi cancelada ou falhou.');
        return;
      }
      button.disabled = false;
      const activated = await activateBiometric(button, statusText);
      if (activated) window.alert('Biometria ativada. No próximo acesso, o MEG solicitará sua digital antes do login.');
    } catch (cause) {
      window.alert(readableBiometricError(cause));
    } finally {
      button.disabled = false;
      button.textContent = originalText;
      await updateButton().catch(() => undefined);
    }
  });

  const disableButton = document.createElement('button');
  disableButton.type = 'button';
  disableButton.hidden = true;
  disableButton.addEventListener('click', async () => {
    await clearBiometricLogin();
    await updateButton();
  });

  return true;
}

export function initializeAuthenticatedBiometricSettings() {
  const tryMount = async () => {
    mountAttempts += 1;
    if (await mountSettingsButton().catch(() => false)) {
      settingsObserver?.disconnect();
      settingsObserver = null;
      if (settingsTimer) clearTimeout(settingsTimer);
      settingsTimer = null;
      return;
    }
    if (mountAttempts < 40) settingsTimer = setTimeout(tryMount, 500);
  };

  tryMount();
  settingsObserver = new MutationObserver(() => {
    if (document.querySelector('#logoutBtn')) tryMount();
  });
  settingsObserver.observe(document.documentElement, { childList: true, subtree: true });
}
