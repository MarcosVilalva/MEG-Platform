import {
  clearBiometricLogin,
  getBiometricLoginStatus,
  requestBiometricLogin,
  saveBiometricLogin,
} from './native-biometric-login.js';
import { createStateSyncBaseline, createTransactionPatch } from './legacy-state-patch.js';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const APP_ENV = 'production';
const STAGING_ADMIN_EMAIL = '';
const ENV_SUFFIX = '';
const ACCESS_KEY = `meg-access-token${ENV_SUFFIX}`;
const REFRESH_KEY = `meg-refresh-token${ENV_SUFFIX}`;
const USER_KEY = `meg-auth-user${ENV_SUFFIX}`;
const STATE_KEY = `meg-financas-state-v4-paid-fixes${ENV_SUFFIX}`;
const REVISION_KEY = `meg-cloud-revision-v1${ENV_SUFFIX}`;
const ACTIVE_SYNC_INTERVAL_MS = 12000;
const BUSY_SYNC_RETRY_MS = 3500;
const FAILED_SYNC_INTERVAL_MAX_MS = 60000;

let revision = 0;
let saveTimer;
let saveInFlight = false;
let pendingSave = false;
let queuedState = null;
let saveRetryDelayMs = 1500;
let syncBaseline = null;
let pollingTimer;
let remoteCheckInFlight = false;
let remoteFailureCount = 0;
let realtimeListenersBound = false;
const syncChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('meg-cloud-state-v1') : null;

function isNativeAndroid() {
  return Capacitor?.isNativePlatform?.() && Capacitor.getPlatform?.() === 'android';
}

function assertCloudApiConfigured() {
  if (!isNativeAndroid()) return;
  if (/^https:\/\/meg-platform-api\.onrender\.com\/?$/i.test(API_URL)) return;
  throw new Error('O aplicativo Android não está apontando para a API oficial da nuvem. Recompile com VITE_API_URL=https://meg-platform-api.onrender.com para evitar divergência entre web e app.');
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resilientFetch(url, options = {}, { retries = 1, timeoutMs = 18000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, { ...options, signal: controller?.signal || options.signal });
      if (timeout) window.clearTimeout(timeout);
      return response;
    } catch (cause) {
      if (timeout) window.clearTimeout(timeout);
      lastError = cause;
      if (attempt >= retries) break;
      await wait(900 + attempt * 800);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Falha de conexao com a API.');
}

function session() {
  try {
    return {
      accessToken: sessionStorage.getItem(ACCESS_KEY),
      refreshToken: sessionStorage.getItem(REFRESH_KEY),
      user: JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function persistSession(payload) {
  sessionStorage.setItem(ACCESS_KEY, payload.accessToken);
  sessionStorage.setItem(REFRESH_KEY, payload.refreshToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  // Versions prior to 1.1.39 kept credentials indefinitely. Remove them so
  // closing the tab or native WebView always requires a new authentication.
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function clearLocalCloudSession() {
  clearSession();
}

export async function warmCloudApi({ keepLoading = false, retryUntilReady = false } = {}) {
  assertCloudApiConfigured();
  let attempt = 0;
  while (true) {
    attempt += 1;
    showCloudLoading(
      'Conectando ao banco de dados...',
      attempt === 1
        ? 'Preparando a nuvem antes da validação de segurança'
        : `Tentativa ${attempt}. O MEG continuará tentando automaticamente`
    );
    try {
      const response = await resilientFetch(`${API_URL}/health`, { cache: 'no-store' }, { retries: 0, timeoutMs: 15_000 });
      if (!response.ok) throw new Error(`API indisponível (${response.status}).`);
      console.info('[MEG database] conexão disponível', { attempt });
      const payload = await response.json().catch(() => ({ status: 'ok' }));
      if (!keepLoading) hideCloudLoading();
      return payload;
    } catch (cause) {
      console.warn('[MEG database] tentativa de conexão falhou', { attempt, reason: cause?.message || String(cause) });
      if (!retryUntilReady) {
        if (!keepLoading) hideCloudLoading();
        throw cause;
      }
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      showCloudLoading(
        offline ? 'Sem conexão com a internet' : 'Servidor ainda iniciando...',
        'O MEG continuará tentando automaticamente antes de liberar seu acesso'
      );
      await wait(Math.min(1500 * attempt, 6000));
    }
  }
}

function assertStagingAdmin(user) {
  if (APP_ENV !== 'staging') return;
  const email = String(user?.email || '').trim().toLowerCase();
  if (email !== STAGING_ADMIN_EMAIL) {
    clearSession();
    throw new Error('Ambiente de testes liberado apenas para o administrador principal.');
  }
}

export function showCloudLoading(message = 'Carregando dados financeiros...', detail = 'Sincronizando com a nuvem') {
  let overlay = document.querySelector('#cloudLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cloudLoadingOverlay';
    overlay.className = 'cloud-loading-overlay';
    overlay.innerHTML = '<div class="cloud-loading-card"><span>M</span><strong></strong><small>Sincronizando com a nuvem</small></div>';
    document.body.appendChild(overlay);
  }
  overlay.querySelector('strong').textContent = message;
  overlay.querySelector('small').textContent = detail;
  overlay.classList.remove('hidden');
}

export function hideCloudLoading() {
  document.querySelector('#cloudLoadingOverlay')?.classList.add('hidden');
}

// Discard credentials written by older builds. Financial data remains in its
// own storage key and is not affected by this security migration.
localStorage.removeItem(ACCESS_KEY);
localStorage.removeItem(REFRESH_KEY);
localStorage.removeItem(USER_KEY);

async function refreshAccess() {
  const current = session();
  if (!current.refreshToken) return false;
  const response = await resilientFetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken })
  }, { retries: 1, timeoutMs: 15000 });
  if (!response.ok) return false;
  persistSession(await response.json());
  return true;
}

async function api(path, options = {}, retry = true) {
  const current = session();
  const isRevisionRequest = path === '/app-state/revision';
  const isAppStateRequest = path === '/app-state' || path.startsWith('/app-state/');
  const retries = isRevisionRequest ? 0 : 1;
  const timeoutMs = isRevisionRequest ? 8000 : isAppStateRequest ? 22000 : 18000;
  const response = await resilientFetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(current.accessToken ? { Authorization: `Bearer ${current.accessToken}` } : {}),
      ...options.headers
    }
  }, { retries, timeoutMs });
  if (response.status === 401 && retry && await refreshAccess()) return api(path, options, false);
  return response;
}

async function waitForSaveIdle(timeoutMs = 8000) {
  const startedAt = Date.now();
  while (saveInFlight) {
    if (Date.now() - startedAt >= timeoutMs) throw new Error('O salvamento demorou mais que o esperado. Tente sair novamente.');
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

async function saveBeforeLogout() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  // A cópia local já é gravada pelo app antes de chegar aqui. Mantemos a
  // última alteração na fila até a API confirmá-la, inclusive se o usuário
  // fechar o WebView logo após salvar.
  const latestState = window.MEG_APP?.getStateRef?.() || window.MEG_APP?.getState?.() || queuedState;
  if (latestState) queuedState = latestState;
  await flushQueuedSave({ immediate: true, throwOnError: true });
  await waitForSaveIdle();
  window.MEG_APP?.flushLocalStateSave?.();
}

function friendlyAuthError(code) {
  const messages = {
    ACCOUNT_NOT_FOUND: 'Este e-mail ainda não está cadastrado. Clique em Solicitar acesso para realizar seu cadastro.',
    ACCESS_PENDING: 'Seu cadastro foi recebido e está aguardando aprovação do administrador.',
    ACCESS_REJECTED: 'Sua solicitação de acesso foi rejeitada. Fale com o administrador.',
    USER_BLOCKED: 'Este usuário está bloqueado. Fale com o administrador.',
    INVALID_CREDENTIALS: 'E-mail ou senha inválidos.',
    EMAIL_ALREADY_REGISTERED: 'Este e-mail já está cadastrado.',
    EMAIL_DELIVERY_FAILED: 'Não foi possível enviar o e-mail. Avise o administrador para revisar a configuração de e-mail.',
    NOTIFICATION_DELIVERY_FAILED: 'Não foi possível entregar a nova senha por e-mail nem por WhatsApp. Avise o administrador.',
    PASSWORD_RESET_RATE_LIMITED: 'Uma nova senha já foi enviada recentemente. Aguarde 10 minutos antes de tentar novamente.',
    WORKSPACE_NOT_FOUND: 'Espaço não encontrado. Confira o código informado ou peça ao administrador.',
    WORKSPACE_MEMBER_LIMIT_REACHED: 'O limite de usuários deste plano foi atingido. Fale com o administrador do espaço.',
    LICENSE_PENDING: 'A licença deste espaço ainda aguarda ativação.',
    LICENSE_EXPIRED: 'A licença deste espaço expirou. O administrador comercial precisa renová-la.',
    LICENSE_SUSPENDED: 'Este espaço está temporariamente suspenso.',
    LICENSE_CANCELLED: 'A licença deste espaço foi cancelada.',
    LICENSE_PAST_DUE: 'A licença deste espaço possui pagamento pendente.',
    LICENSE_NOT_CONFIGURED: 'Este espaço ainda não possui uma licença configurada.',
    VALIDATION_ERROR: 'Revise os dados informados.'
  };
  return messages[code] || 'Não foi possível concluir a operação.';
}

async function authenticateCredentials(credentials) {
  console.info('[MEG auth] criando sessão autenticada');
  const response = await resilientFetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }, { retries: 1, timeoutMs: 20000 });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(friendlyAuthError(payload.error));
    error.code = payload.error;
    throw error;
  }
  assertStagingAdmin(payload.user);
  persistSession(payload);
  console.info('[MEG auth] sessão criada', { role: payload.user?.role || null });
  return payload;
}

function authMarkup() {
  return `
    <div class="auth-shell" id="authShell">
      <section class="auth-showcase" aria-label="Apresentação do MEG Finanças">
        <div class="auth-showcase-brand"><span>M</span><strong>MEG Finanças</strong></div>
        <div class="auth-showcase-copy">
          <small>SEU CONTROLE FINANCEIRO, TODOS OS DIAS</small>
          <h1>Clareza para decidir.<br>Agilidade para registrar.</h1>
          <p>Organize receitas, despesas e vencimentos em um só lugar. Acompanhe o mês, receba alertas e cuide do seu dinheiro com confiança.</p>
        </div>
        <div class="auth-benefits">
          <span>✓ Visão rápida da sua situação</span>
          <span>✓ Lançamentos e contas a pagar</span>
          <span>✓ Alertas por WhatsApp e e-mail</span>
        </div>
        <div class="auth-trust"><b>Dados sincronizados</b><span>Web e aplicativo sempre juntos</span></div>
      </section>
      <section class="auth-card">
        <div class="auth-staging-notice" role="status">
          <strong>Ambiente de testes</strong>
          <span>Acesso restrito ao administrador. Use para validar melhorias antes da produção.</span>
        </div>
        <div class="auth-brand"><span>M</span><div><strong>MEG Finanças</strong><small>Seu dinheiro. Suas escolhas. Seu controle.</small></div></div>
        <div class="auth-tabs"><button class="active" data-auth-tab="login">Entrar</button><button data-auth-tab="register">Começar</button></div>
        <form id="loginForm" class="auth-form">
          <div class="auth-form-heading"><small>ÁREA SEGURA</small><h1>Bem-vindo de volta</h1><p>Entre para visualizar seu painel financeiro.</p></div>
          <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
          <label>Senha<input name="password" type="password" autocomplete="current-password" minlength="8" required /></label>
          <p class="auth-error" id="loginError"></p>
          <button class="button primary" type="submit">Acessar meu painel <span>→</span></button>
          <button class="auth-link" id="forgotPasswordButton" type="button">Esqueci minha senha</button>
        </form>
        <form id="registerForm" class="auth-form hidden">
          <h1>Comece no MEG</h1>
          <label>Tipo de cadastro<select name="accountType" id="accountType"><option value="CREATE_WORKSPACE">Criar meu espaço financeiro</option><option value="REQUEST_ACCESS">Entrar em um espaço existente</option></select></label>
          <label id="workspaceNameField">Nome do seu espaço<input name="workspaceName" minlength="2" maxlength="120" value="Meu MEG" required /><small>Você será o administrador e começará com uma base vazia.</small></label>
          <label id="workspacePlanField">Plano inicial<select name="planCode"><option value="ESSENCIAL">Essencial · 1 acesso</option><option value="FAMILIA" selected>Família · até 6 acessos</option><option value="PRO">Pro · até 10 acessos</option></select><small>O plano só começa após a aprovação comercial.</small></label>
          <label id="workspaceSlugField" class="hidden">Código do espaço<input name="workspaceSlug" minlength="2" maxlength="80" placeholder="ex.: familia-silva" /><small>Peça este código ao administrador do seu espaço.</small></label>
          <label>Nome<input name="name" autocomplete="name" required /></label>
          <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
          <label>WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="5518999999999" minlength="10" maxlength="18" required /><small>Informe DDD e número. Usaremos para avisos de aprovação e recuperação.</small></label>
          <label>Senha<input name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
          <label>Repetir senha<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
          <p class="auth-error" id="registerError"></p>
          <button class="button primary" type="submit">Enviar solicitação</button>
        </form>
        <form id="forgotForm" class="auth-form hidden">
          <h1>Recupere seu acesso</h1>
          <p>Informe seu e-mail para receber uma senha temporária.</p>
          <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
          <p class="auth-error" id="forgotError"></p>
          <button class="button primary" type="submit">Enviar nova senha</button>
          <button class="auth-link" id="backToLoginButton" type="button">Voltar para entrar</button>
        </form>
      </section>
    </div>`;
}

function showAuthentication() {
  document.body.insertAdjacentHTML('beforeend', authMarkup());
  const shell = document.querySelector('#authShell');
  const login = document.querySelector('#loginForm');
  const register = document.querySelector('#registerForm');
  const forgot = document.querySelector('#forgotForm');
  let biometricStatus = { available: false, enabled: false };
  hideCloudLoading();

  const inactivityMessage = sessionStorage.getItem('meg-inactivity-message');
  if (inactivityMessage) {
    const loginError = document.querySelector('#loginError');
    loginError.textContent = inactivityMessage;
    loginError.classList.add('session-ended');
    sessionStorage.removeItem('meg-inactivity-message');
  }

  function selectMode(mode) {
    shell.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.toggle('active', item.dataset.authTab === mode));
    login.classList.toggle('hidden', mode !== 'login');
    register.classList.toggle('hidden', mode !== 'register');
    forgot.classList.toggle('hidden', mode !== 'forgot');
    if (window.matchMedia('(max-width: 980px)').matches) {
      requestAnimationFrame(() => shell.scrollTo({ top: 0, behavior: 'auto' }));
    }
  }

  shell.querySelectorAll('input').forEach((input) => input.addEventListener('focus', () => {
    if (!window.matchMedia('(max-width: 680px)').matches) return;
    window.setTimeout(() => input.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }), 180);
  }));

  shell.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.authTab;
    selectMode(mode);
  }));
  document.querySelector('#forgotPasswordButton').addEventListener('click', () => selectMode('forgot'));
  document.querySelector('#backToLoginButton').addEventListener('click', () => selectMode('login'));
  const accountType = document.querySelector('#accountType');
  const workspaceNameField = document.querySelector('#workspaceNameField');
  const workspaceSlugField = document.querySelector('#workspaceSlugField');
  const workspacePlanField = document.querySelector('#workspacePlanField');
  const syncRegistrationType = () => {
    const createsWorkspace = accountType.value === 'CREATE_WORKSPACE';
    workspaceNameField.classList.toggle('hidden', !createsWorkspace);
    workspaceNameField.querySelector('input').required = createsWorkspace;
    workspacePlanField.classList.toggle('hidden', !createsWorkspace);
    workspaceSlugField.classList.toggle('hidden', createsWorkspace);
    workspaceSlugField.querySelector('input').required = !createsWorkspace;
  };
  accountType.addEventListener('change', syncRegistrationType);
  syncRegistrationType();

  let resolveAuth;

  async function loginWithCredentials(credentials, { offerBiometricSetup = false } = {}) {
    const payload = await authenticateCredentials(credentials);
    if (offerBiometricSetup && biometricStatus.available && !biometricStatus.enabled) {
      const wantsBiometric = window.confirm('Deseja usar biometria para entrar mais rápido nas próximas vezes neste aparelho?');
      if (wantsBiometric) {
        const saved = await saveBiometricLogin({ email: credentials.email, password: credentials.password });
        biometricStatus = { ...biometricStatus, enabled: Boolean(saved?.saved), email: credentials.email };
      }
    }
    shell.remove();
    showCloudLoading();
    return payload.user;
  }

  async function performAutomaticBiometricLogin() {
    const error = document.querySelector('#loginError');
    error.classList.remove('session-ended');
    error.textContent = 'Confirme sua biometria para entrar automaticamente...';
    const credentials = await requestBiometricLogin();
    if (!credentials) {
      error.textContent = 'Biometria cancelada ou indisponível. Use e-mail e senha.';
      return;
    }
    try {
      const user = await loginWithCredentials(credentials);
      resolveAuth?.(user);
    } catch (cause) {
      if (cause?.code === 'INVALID_CREDENTIALS') {
        await clearBiometricLogin();
        biometricStatus = { available: true, enabled: false, reason: 'CREDENTIALS_CHANGED' };
        error.textContent = 'Sua senha mudou. Entre com e-mail e senha para ativar novamente a biometria neste Android.';
        return;
      }
      error.textContent = cause instanceof Error ? cause.message : 'Não foi possível conectar à API.';
    }
  }

  getBiometricLoginStatus().then((status) => {
    biometricStatus = status || { available: false, enabled: false };
    if (biometricStatus.available && biometricStatus.enabled) {
      window.setTimeout(performAutomaticBiometricLogin, 350);
    }
  }).catch(() => undefined);

  return new Promise((resolve) => {
    resolveAuth = resolve;
    login.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.querySelector('#loginError');
      error.classList.remove('session-ended');
      error.textContent = 'Conectando...';
      try {
        const body = Object.fromEntries(new FormData(login));
        const user = await loginWithCredentials(body, { offerBiometricSetup: true });
        resolve(user);
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
        const response = await resilientFetch(`${API_URL}/auth/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        }, { retries: 0, timeoutMs: 20000 });
        const payload = await response.json();
        if (!response.ok) throw new Error(friendlyAuthError(payload.error));
        if (payload.accessToken) {
          persistSession(payload);
          shell.remove();
          showCloudLoading();
          resolve(payload.user);
          return;
        }
        error.classList.add('success');
        error.textContent = 'Solicitação enviada. O administrador precisa aprovar seu acesso.';
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : 'Não foi possível conectar à API.';
      }
    });

    forgot.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.querySelector('#forgotError');
      error.classList.remove('success');
      error.textContent = 'Enviando...';
      try {
        const body = Object.fromEntries(new FormData(forgot));
        const response = await resilientFetch(`${API_URL}/auth/forgot-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        }, { retries: 0, timeoutMs: 20000 });
        const payload = await response.json();
        if (!response.ok) throw new Error(friendlyAuthError(payload.error));
        error.classList.add('success');
        const channels = (payload.notifications || []).filter((item) => item.status === 'sent').map((item) => item.channel === 'email' ? 'e-mail' : 'WhatsApp');
        const failed = (payload.notifications || []).filter((item) => item.status === 'failed').map((item) => item.channel === 'email' ? 'e-mail' : 'WhatsApp');
        error.textContent = `Nova senha temporária enviada por ${channels.join(' e ')}.${failed.length ? ` Não entregue por ${failed.join(' e ')}.` : ''}`;
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : 'Não foi possível conectar à API.';
      }
    });
  });
}

async function validateOrLogin({ biometricCredentials = null } = {}) {
  if (biometricCredentials?.email && biometricCredentials?.password) {
    showCloudLoading('Biometria reconhecida', 'Criando uma sessão nova antes de carregar seus dados');
    try {
      return (await authenticateCredentials(biometricCredentials)).user;
    } catch (cause) {
      clearSession();
      if (cause?.code === 'INVALID_CREDENTIALS') await clearBiometricLogin();
      sessionStorage.setItem(
        'meg-inactivity-message',
        cause?.code === 'INVALID_CREDENTIALS'
          ? 'Sua senha mudou. Entre novamente para ativar a biometria neste Android.'
          : 'Não foi possível concluir o acesso biométrico. Entre com e-mail e senha.'
      );
      hideCloudLoading();
    }
  }
  const current = session();
  if (current.accessToken) {
    showCloudLoading('Validando acesso...', 'Conferindo sua sessão segura');
    try {
      const response = await api('/auth/me');
      if (response.ok) {
        const user = (await response.json()).user;
        assertStagingAdmin(user);
        return user;
      }
    } catch {}
    clearSession();
    hideCloudLoading();
  }
  hideCloudLoading();
  return showAuthentication();
}

async function loadCloudState() {
  const response = await api('/app-state');
  if (!response.ok) throw new Error('Não foi possível carregar seus dados da nuvem.');
  const payload = await response.json();
  revision = payload.revision || 0;
  localStorage.setItem(REVISION_KEY, String(revision));
  const stateFromCloud = payload?.state;
  // Backups antigos podem ainda não ter a chave budgets. Eles continuam sendo
  // uma base financeira válida e não podem resultar em uma tela vazia.
  const remoteState = Array.isArray(stateFromCloud?.transactions)
    ? {
        ...stateFromCloud,
        budgets: stateFromCloud.budgets && typeof stateFromCloud.budgets === 'object'
          ? stateFromCloud.budgets
          : {}
      }
    : null;
  const isUsableState = Array.isArray(remoteState?.transactions);

  console.info('[MEG database] app-state recebido', {
    revision,
    usable: isUsableState,
    transactions: isUsableState ? remoteState.transactions.length : null,
  });

  if (isUsableState) {
    let cachedState = null;
    try { cachedState = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch {}
    const cachedTransactions = Array.isArray(cachedState?.transactions) ? cachedState.transactions : [];

    // A API é a fonte da verdade. Gravar uma resposta válida antes de montar
    // a interface impede que um cache local vazio e antigo vença a base real
    // durante a inicialização do Android. Nunca substituímos uma cópia válida
    // por uma resposta vazia inesperada.
    if (remoteState.transactions.length > 0 || cachedTransactions.length === 0) {
      localStorage.setItem(STATE_KEY, JSON.stringify(remoteState));
    }
    window.MEG_REAL_STATE = remoteState;
    syncBaseline = createStateSyncBaseline(remoteState);
  }
  return payload;
}

async function saveNow(state, { force = false, retryConflict = true } = {}) {
  // Não espere uma leitura remota em andamento. Esperar aqui fazia uma
  // alteração recente competir com um snapshot antigo e, no Android, podia
  // reaparecer a versão anterior ao voltar para o aplicativo.
  saveInFlight = true;
  try {
    const transactionPatch = force ? null : createTransactionPatch(syncBaseline, state);
    let response;
    let saveMode = 'full';

    if (transactionPatch) {
      if (transactionPatch.upserts.length === 0 && transactionPatch.deletes.length === 0) {
        const status = document.querySelector('#cloudSyncStatus');
        if (status) status.textContent = `Sincronizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        return { revision, changed: false, mode: 'none' };
      }
      response = await api('/app-state/transactions', {
        method: 'PATCH',
        body: JSON.stringify({ ...transactionPatch, expectedRevision: revision })
      });
      if (response.status === 404 || response.status === 405) {
        response = undefined;
      } else {
        saveMode = 'transactions';
      }
    }

    if (!response) {
      const serializedState = JSON.stringify(state);
      const body = force
        ? `{"state":${serializedState}}`
        : `{"state":${serializedState},"expectedRevision":${revision}}`;
      response = await api('/app-state', { method: 'PUT', body });
    }

    if (response.status === 409) {
      // Para patches de lançamentos, atualizar apenas a revisão e repetir o
      // patch preserva as alterações locais sem sobrescrever os dados de outro
      // aparelho. Isto também resolve a disputa entre dois salvamentos rápidos.
      if (retryConflict && transactionPatch) {
        const remote = await api('/app-state');
        if (remote.ok) {
          const latest = await remote.json();
          revision = Number(latest.revision || revision);
          localStorage.setItem(REVISION_KEY, String(revision));
          syncBaseline = createStateSyncBaseline(latest.state || {});
          return saveNow(state, { force, retryConflict: false });
        }
      }
      throw new Error('Os dados foram alterados em outro dispositivo. A alteração local será tentada novamente assim que a nuvem for atualizada.');
    }
    const raw = await response.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch {}
    if (!response.ok) {
      const detail = payload.error || payload.message || raw || 'sem detalhes';
      if (response.status === 402) throw new Error(friendlyAuthError(detail));
      throw new Error(`Falha ao salvar na nuvem (${response.status}): ${detail}`);
    }
    revision = Number(payload.revision ?? revision);
    localStorage.setItem(REVISION_KEY, String(revision));
    syncBaseline = createStateSyncBaseline(state);
    syncChannel?.postMessage({ revision });
    const status = document.querySelector('#cloudSyncStatus');
    if (status) status.textContent = `Sincronizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return { ...payload, mode: saveMode };
  } finally {
    saveInFlight = false;
  }
}

async function flushQueuedSave({ immediate = false, throwOnError = false } = {}) {
  if (saveInFlight) {
    saveTimer = window.setTimeout(flushQueuedSave, 50);
    return;
  }
  if (!queuedState) return;
  const snapshot = queuedState;
  queuedState = null;
  const status = document.querySelector('#cloudSyncStatus');
  try {
    await saveNow(snapshot);
    saveRetryDelayMs = 1500;
  } catch (error) {
    if (status) status.textContent = error.message;
    // Nunca descarte uma alteração financeira quando a conexão falhar.
    // Uma alteração posterior prevalece, mas este snapshot continua sendo
    // enviado quando a rede/API voltar.
    queuedState ||= snapshot;
    pendingSave = true;
    const retryDelay = immediate ? 350 : saveRetryDelayMs;
    saveRetryDelayMs = Math.min(saveRetryDelayMs * 2, FAILED_SYNC_INTERVAL_MAX_MS);
    saveTimer = window.setTimeout(() => {
      saveTimer = undefined;
      flushQueuedSave().catch(() => undefined);
    }, retryDelay);
    // O chamador pode avisar que a conexão não confirmou a saída, mas a fila
    // continua programada para sincronizar assim que a API responder.
    if (throwOnError) throw error;
  } finally {
    if (queuedState && !saveTimer) {
      saveTimer = window.setTimeout(flushQueuedSave, 0);
    } else if (!saveTimer) {
      pendingSave = false;
    }
  }
}

function queueSave(state) {
  const status = document.querySelector('#cloudSyncStatus');
  if (status) status.textContent = 'Sincronizando...';
  queuedState = state;
  pendingSave = true;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;
    flushQueuedSave();
  }, 300);
}

function applyRemoteState(payload, source = 'nuvem') {
  const incomingRevision = Number(payload?.revision || 0);
  if (!payload?.state || incomingRevision <= revision || pendingSave || saveInFlight) return false;
  revision = incomingRevision;
  localStorage.setItem(REVISION_KEY, String(revision));
  localStorage.setItem(STATE_KEY, JSON.stringify(payload.state));
  window.MEG_REAL_STATE = payload.state;
  syncBaseline = createStateSyncBaseline(payload.state);
  window.MEG_APP?.replaceState(payload.state);
  window.MEG_NATIVE_NOTIFICATIONS?.sync?.(payload.state);
  const status = document.querySelector('#cloudSyncStatus');
  if (status) status.textContent = `Atualizado pela ${source} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return true;
}

function nextRemoteCheckDelay() {
  if (!remoteFailureCount) return ACTIVE_SYNC_INTERVAL_MS;
  return Math.min(ACTIVE_SYNC_INTERVAL_MS * (2 ** remoteFailureCount), FAILED_SYNC_INTERVAL_MAX_MS);
}

function scheduleRemoteCheck(delay = ACTIVE_SYNC_INTERVAL_MS) {
  clearTimeout(pollingTimer);
  pollingTimer = undefined;
  if (document.hidden || navigator.onLine === false) return;
  pollingTimer = window.setTimeout(() => {
    pollingTimer = undefined;
    checkForRemoteState();
  }, Math.max(0, delay));
}

async function checkForRemoteState() {
  if (document.hidden || navigator.onLine === false) return;
  if (pendingSave || saveInFlight || remoteCheckInFlight) {
    scheduleRemoteCheck(BUSY_SYNC_RETRY_MS);
    return;
  }
  remoteCheckInFlight = true;
  try {
    const revisionResponse = await api('/app-state/revision');
    if (!revisionResponse.ok) throw new Error(`REVISION_${revisionResponse.status}`);
    const metadata = await revisionResponse.json();
    if (Number(metadata?.revision || 0) > revision) {
      const stateResponse = await api('/app-state');
      if (!stateResponse.ok) throw new Error(`STATE_${stateResponse.status}`);
      applyRemoteState(await stateResponse.json());
    }
    remoteFailureCount = 0;
  } catch {
    // A temporary network failure must not interrupt local usage.
    remoteFailureCount += 1;
  } finally {
    remoteCheckInFlight = false;
    scheduleRemoteCheck(nextRemoteCheckDelay());
  }
}

function handleSyncChannelMessage(event) {
  if (event.data?.state) {
    applyRemoteState(event.data, 'outra aba');
    return;
  }
  if (Number(event.data?.revision || 0) > revision) scheduleRemoteCheck(0);
}

function startRealtimeSync() {
  scheduleRemoteCheck(ACTIVE_SYNC_INTERVAL_MS);
  if (realtimeListenersBound) return;
  realtimeListenersBound = true;
  window.addEventListener('focus', () => scheduleRemoteCheck(0));
  window.addEventListener('online', () => {
    remoteFailureCount = 0;
    scheduleRemoteCheck(0);
  });
  window.addEventListener('offline', () => {
    clearTimeout(pollingTimer);
    pollingTimer = undefined;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Em Android, trocar de tela/fechar o app pode pausar a WebView antes do
      // debounce normal. Forçamos a tentativa de envio, sem bloquear a UI.
      flushQueuedSave({ immediate: true }).catch(() => undefined);
      clearTimeout(pollingTimer);
      pollingTimer = undefined;
    } else {
      scheduleRemoteCheck(0);
    }
  });
  window.addEventListener('pagehide', () => {
    flushQueuedSave({ immediate: true }).catch(() => undefined);
  });
  syncChannel?.addEventListener('message', handleSyncChannelMessage);
}

export async function bootstrapCloud({ biometricCredentials = null, keepLoading = false } = {}) {
  assertCloudApiConfigured();
  const user = await validateOrLogin({ biometricCredentials });
  showCloudLoading('Carregando seus dados...', 'Buscando a base mais recente');
  let cachedState = null;
  try { cachedState = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch {}
  const hasCache = Array.isArray(cachedState?.transactions);
  revision = Number(localStorage.getItem(REVISION_KEY) || 0);
  const cachedRevision = revision;
  if (hasCache) {
    window.MEG_REAL_STATE = cachedState;
    syncBaseline = createStateSyncBaseline(cachedState);
  }
  let freshState;
  try {
    freshState = await loadCloudState().then((payload) => {
      const remoteState = window.MEG_REAL_STATE;
      const remoteTransactions = Array.isArray(payload?.state?.transactions) ? payload.state.transactions : null;
      const cacheTransactions = Array.isArray(cachedState?.transactions) ? cachedState.transactions : [];

      // A base remota nunca pode substituir uma cópia válida por uma resposta
      // vazia inesperada. Isso pode acontecer durante uma atualização do APK,
      // uma sessão expirada ou enquanto a API gratuita está acordando.
      if ((!remoteTransactions || remoteTransactions.length === 0) && cacheTransactions.length > 0) {
        window.MEG_REAL_STATE = cachedState;
        syncBaseline = createStateSyncBaseline(cachedState);
        return {
          state: cachedState,
          changed: false,
          warning: 'A nuvem respondeu sem lançamentos. Sua cópia local foi preservada; toque em Recarregar da nuvem após confirmar a conexão.'
        };
      }

      if (!remoteTransactions) {
        const emptyState = { transactions: [], budgets: {} };
        window.MEG_REAL_STATE = emptyState;
        syncBaseline = createStateSyncBaseline(emptyState);
      }
      return {
        state: window.MEG_REAL_STATE || remoteState,
        changed: hasCache && Number(payload.revision || 0) !== cachedRevision
      };
    });
  } catch (cause) {
    if (!hasCache) {
      hideCloudLoading();
      throw cause;
    }
    freshState = {
      state: cachedState,
      changed: false,
      warning: 'Não foi possível atualizar a nuvem agora. Usando dados salvos neste aparelho.'
    };
    window.MEG_REAL_STATE = cachedState;
  }
  if (!keepLoading) hideCloudLoading();
  window.MEG_CLOUD = {
    user,
    apiUrl: API_URL,
    whenFresh: Promise.resolve(freshState),
    saveState: queueSave,
    saveNow,
    flush: flushQueuedSave,
    async reload() {
      await loadCloudState();
      location.reload();
    },
    async logout({ save = true, nativeExit = false } = {}) {
      if (save) await saveBeforeLogout();
      const current = session();
      if (current.refreshToken) {
        await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) }).catch(() => undefined);
      }
      clearSession();
      if (nativeExit && isNativeAndroid()) {
        try {
          const { App } = await import('@capacitor/app');
          await App.exitApp();
          return;
        } catch {
          // Em navegadores e em WebViews sem a API App, mantemos o logout
          // normal para nunca prender o usuário na tela atual.
        }
      }
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
    async listNotificationEmailRecipients() {
      const response = await api('/notifications/email-recipients');
      if (!response.ok) throw new Error('Não foi possível carregar os e-mails.');
      return response.json();
    },
    async addNotificationEmailRecipient(name, email) {
      const response = await api('/notifications/email-recipients', { method: 'POST', body: JSON.stringify({ name, email }) });
      if (!response.ok) throw new Error('Informe um nome e um e-mail válido.');
      return response.json();
    },
    async removeNotificationEmailRecipient(id) {
      const response = await api(`/notifications/email-recipients/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível remover o e-mail.');
    },
    async sendNotifications(recipientIds = [], emailRecipientIds = []) {
      const response = await api('/notifications/send', { method: 'POST', body: JSON.stringify({ recipientIds, emailRecipientIds }) });
      if (!response.ok) throw new Error('Não foi possível enviar os alertas.');
      return response.json();
    },
    async getWorkspaceIntegrations() {
      const response = await api('/integrations');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 403 ? 'Somente o administrador do espaço pode configurar integrações.' : 'Não foi possível carregar as integrações.');
      return result;
    },
    async saveWorkspaceIntegrations(payload) {
      const response = await api('/integrations', { method: 'PUT', body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'WHATSAPP_CONFIGURATION_INCOMPLETE' ? 'Preencha URL, instância e chave do WhatsApp.' : 'Não foi possível salvar as integrações.');
      return result;
    },
    async testWorkspaceWhatsapp() {
      const response = await api('/integrations/test-whatsapp', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'OWNER_PHONE_REQUIRED' ? 'Cadastre o WhatsApp do administrador do espaço antes do teste.' : 'Não foi possível enviar o teste do WhatsApp.');
      return result;
    },    async listManagedUsers() {
      const response = await api('/auth/users');
      if (!response.ok) throw new Error(response.status === 403 ? 'Apenas administradores podem gerenciar usuários.' : 'Não foi possível carregar os usuários.');
      return response.json();
    },
    async listCommercialWorkspaces() {
      const response = await api('/platform-admin/workspaces');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'PLATFORM_ADMIN_REQUIRED' ? 'Apenas o administrador da plataforma pode acessar esta área.' : 'Não foi possível carregar os clientes.');
      return result;
    },
    async createCommercialInvoice(workspaceId, payload) {
      const response = await api(`/platform-admin/workspaces/${encodeURIComponent(workspaceId)}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Não foi possível gerar a mensalidade.');
      return result;
    },
    async changeCommercialInvoice(invoiceId, payload) {
      const response = await api(`/platform-admin/invoices/${encodeURIComponent(invoiceId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Não foi possível atualizar a mensalidade.');
      return result;
    },    async changeCommercialLicense(workspaceId, payload) {
      const response = await api(`/platform-admin/workspaces/${encodeURIComponent(workspaceId)}/license`, { method: 'PATCH', body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'PLAN_NOT_FOUND' ? 'Plano não encontrado.' : 'Não foi possível atualizar a licença.');
      return result;
    },
    async changeUserAccess(userId, payload) {
      const response = await api(`/auth/users/${encodeURIComponent(userId)}/access`, { method: 'PATCH', body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'PRIMARY_ADMIN_CANNOT_BE_BLOCKED' ? 'O administrador principal não pode ser bloqueado.' : 'Não foi possível atualizar o acesso.');
      return result;
    },
    async deleteManagedUser(userId) {
      const response = await api(`/auth/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'PRIMARY_ADMIN_CANNOT_BE_DELETED' ? 'O administrador principal não pode ser excluído.' : 'Não foi possível excluir este acesso.');
      return result;
    },
    async resetUserPassword(userId) {
      const response = await api(`/auth/users/${encodeURIComponent(userId)}/reset-password`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error === 'EMAIL_DELIVERY_FAILED' || result.error === 'NOTIFICATION_DELIVERY_FAILED' ? 'A senha não foi alterada porque nem o e-mail nem o WhatsApp puderam ser entregues.' : result.error === 'USER_NOT_ACTIVE' ? 'Ative o usuário antes de redefinir a senha.' : 'Não foi possível redefinir a senha.');
      return result;
    },
    async testUserEmail(userId) {
      const response = await api(`/auth/users/${encodeURIComponent(userId)}/test-email`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.email?.detail || 'O provedor recusou o e-mail de teste.');
      return result;
    }
  };
  startRealtimeSync();
}
