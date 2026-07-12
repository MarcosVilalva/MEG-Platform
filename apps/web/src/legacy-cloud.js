const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const ACCESS_KEY = 'meg-access-token';
const REFRESH_KEY = 'meg-refresh-token';
const USER_KEY = 'meg-auth-user';
const STATE_KEY = 'meg-financas-state-v4-paid-fixes';

let revision = 0;
let saveTimer;

function session() {
  try {
    return {
      accessToken: localStorage.getItem(ACCESS_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      user: JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function persistSession(payload) {
  localStorage.setItem(ACCESS_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_KEY, payload.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshAccess() {
  const current = session();
  if (!current.refreshToken) return false;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken })
  });
  if (!response.ok) return false;
  persistSession(await response.json());
  return true;
}

async function api(path, options = {}, retry = true) {
  const current = session();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(current.accessToken ? { Authorization: `Bearer ${current.accessToken}` } : {}),
      ...options.headers
    }
  });
  if (response.status === 401 && retry && await refreshAccess()) return api(path, options, false);
  return response;
}

function authMarkup() {
  return `
    <div class="auth-shell" id="authShell">
      <section class="auth-card">
        <div class="auth-brand"><span>M</span><div><strong>MEG Finanças</strong><small>Seus dados protegidos e sincronizados</small></div></div>
        <div class="auth-tabs"><button class="active" data-auth-tab="login">Entrar</button><button data-auth-tab="register">Solicitar acesso</button></div>
        <form id="loginForm" class="auth-form">
          <h1>Acesse sua conta</h1>
          <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
          <label>Senha<input name="password" type="password" autocomplete="current-password" minlength="8" required /></label>
          <p class="auth-error" id="loginError"></p>
          <button class="button primary" type="submit">Entrar no MEG</button>
        </form>
        <form id="registerForm" class="auth-form hidden">
          <h1>Solicitar acesso</h1>
          <label>Nome<input name="name" autocomplete="name" required /></label>
          <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
          <label>Senha<input name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
          <label>Repetir senha<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
          <p class="auth-error" id="registerError"></p>
          <button class="button primary" type="submit">Enviar solicitação</button>
        </form>
      </section>
    </div>`;
}

function showAuthentication() {
  document.body.insertAdjacentHTML('beforeend', authMarkup());
  const shell = document.querySelector('#authShell');
  const login = document.querySelector('#loginForm');
  const register = document.querySelector('#registerForm');

  shell.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.authTab;
    shell.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.toggle('active', item === button));
    login.classList.toggle('hidden', mode !== 'login');
    register.classList.toggle('hidden', mode !== 'register');
  }));

  return new Promise((resolve) => {
    login.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.querySelector('#loginError');
      error.textContent = 'Conectando...';
      try {
        const body = Object.fromEntries(new FormData(login));
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error === 'PENDING_APPROVAL' ? 'Seu acesso ainda aguarda aprovação.' : 'E-mail ou senha inválidos.');
        persistSession(payload);
        shell.remove();
        resolve(payload.user);
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : 'Não foi possível conectar à API.';
      }
    });

    register.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.querySelector('#registerError');
      const body = Object.fromEntries(new FormData(register));
      if (body.password !== body.confirmPassword) {
        error.textContent = 'As senhas precisam ser iguais.';
        return;
      }
      error.textContent = 'Enviando...';
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error === 'EMAIL_ALREADY_REGISTERED' ? 'Este e-mail já está cadastrado.' : 'Não foi possível solicitar o acesso.');
        if (payload.accessToken) {
          persistSession(payload);
          shell.remove();
          resolve(payload.user);
          return;
        }
        error.classList.add('success');
        error.textContent = 'Solicitação enviada. O administrador precisa aprovar seu acesso.';
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : 'Não foi possível conectar à API.';
      }
    });
  });
}

async function validateOrLogin() {
  const current = session();
  if (current.accessToken) {
    try {
      const response = await api('/auth/me');
      if (response.ok) return (await response.json()).user;
    } catch {}
    clearSession();
  }
  return showAuthentication();
}

async function loadCloudState() {
  const response = await api('/app-state');
  if (!response.ok) throw new Error('Não foi possível carregar seus dados da nuvem.');
  const payload = await response.json();
  revision = payload.revision || 0;
  if (payload.state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(payload.state));
    window.MEG_REAL_STATE = payload.state;
  } else {
    localStorage.removeItem(STATE_KEY);
    window.MEG_REAL_STATE = { transactions: [], budgets: {} };
  }
}

async function saveNow(state, { force = false } = {}) {
  const response = await api('/app-state', {
    method: 'PUT',
    body: JSON.stringify({ state, ...(force ? {} : { expectedRevision: revision }) })
  });
  if (response.status === 409) {
    throw new Error('Os dados foram alterados em outro dispositivo. Recarregue a nuvem antes de salvar.');
  }
  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) {
    const detail = payload.error || payload.message || raw || 'sem detalhes';
    throw new Error(`Falha ao salvar na nuvem (${response.status}): ${detail}`);
  }
  revision = payload.revision;
  const status = document.querySelector('#cloudSyncStatus');
  if (status) status.textContent = `Salvo ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function queueSave(state) {
  const status = document.querySelector('#cloudSyncStatus');
  if (status) status.textContent = 'Salvando...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(state).catch((error) => {
    if (status) status.textContent = error.message;
  }), 700);
}

export async function bootstrapCloud() {
  const user = await validateOrLogin();
  await loadCloudState();
  window.MEG_CLOUD = {
    user,
    saveState: queueSave,
    saveNow,
    async reload() {
      await loadCloudState();
      location.reload();
    },
    async logout() {
      const current = session();
      if (current.refreshToken) {
        await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) }).catch(() => undefined);
      }
      clearSession();
      location.reload();
    },
    async previewNotifications() {
      const response = await api('/notifications/preview');
      if (!response.ok) throw new Error('Não foi possível gerar o resumo.');
      return response.json();
    },
    async listNotificationRecipients() {
      const response = await api('/notifications/recipients');
      if (!response.ok) throw new Error('Não foi possível carregar os destinatários.');
      return response.json();
    },
    async addNotificationRecipient(name, phone) {
      const response = await api('/notifications/recipients', { method: 'POST', body: JSON.stringify({ name, phone }) });
      if (!response.ok) throw new Error('Informe um nome e um WhatsApp válido com DDD.');
      return response.json();
    },
    async removeNotificationRecipient(id) {
      const response = await api(`/notifications/recipients/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível remover o destinatário.');
    },
    async sendNotifications(recipientIds = []) {
      const response = await api('/notifications/send', { method: 'POST', body: JSON.stringify({ recipientIds }) });
      if (!response.ok) throw new Error('Não foi possível enviar os alertas.');
      return response.json();
    }
  };
}
