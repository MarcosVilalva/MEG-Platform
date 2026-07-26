const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const READY_TIMEOUT_MS = 9000;
const INITIAL_RETRY_DELAY_MS = 1600;
const MAX_RETRY_DELAY_MS = 6000;

function ensureOverlay() {
  let overlay = document.querySelector('#startupReadinessOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'startupReadinessOverlay';
  overlay.className = 'cloud-loading-overlay startup-readiness-overlay';
  overlay.innerHTML = `
    <div class="cloud-loading-card startup-readiness-card">
      <span>M</span>
      <strong>Carregando dados do banco...</strong>
      <small>Conectando ao MEG e preparando o banco de dados antes de liberar seu acesso.</small>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function setStatus(title, detail) {
  const overlay = ensureOverlay();
  overlay.querySelector('strong').textContent = title;
  overlay.querySelector('small').textContent = detail;
  overlay.classList.remove('hidden');
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function probeApi() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), READY_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/auth/me?startup=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'X-MEG-Startup-Probe': '1' }
    });
    // Sem sessão, 401 é a resposta esperada. Ela comprova que a API e o caminho
    // até o banco estão disponíveis para receber a autenticação.
    return response.status === 401 || response.ok || response.status === 403;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function waitUntilReady() {
  let attempt = 0;
  setStatus('Carregando dados do banco...', 'Acordando os serviços e validando a conexão segura.');

  while (true) {
    attempt += 1;
    if (await probeApi()) {
      setStatus('Conexão pronta', 'Banco de dados disponível. Liberando a tela de acesso.');
      await wait(280);
      document.querySelector('#startupReadinessOverlay')?.classList.add('hidden');
      document.body.classList.add('meg-api-ready');
      return true;
    }

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const retryDelay = Math.min(INITIAL_RETRY_DELAY_MS * Math.max(1, attempt), MAX_RETRY_DELAY_MS);
    setStatus(
      offline ? 'Sem conexão com a internet' : 'Servidor ainda iniciando...',
      offline
        ? 'O MEG continuará tentando automaticamente e liberará o login quando a internet voltar.'
        : `Tentativa ${attempt} sem resposta. Nova tentativa automática em ${Math.ceil(retryDelay / 1000)} segundos.`
    );
    await wait(retryDelay);
  }
}

export const apiReadiness = (() => {
  if (import.meta.env.VITE_VALIDATION_MODE === 'true' || new URLSearchParams(location.search).get('validacao') === '1') {
    return Promise.resolve(true);
  }
  return waitUntilReady();
})();

window.MEG_API_READY = apiReadiness;
