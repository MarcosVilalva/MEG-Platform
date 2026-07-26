const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const READY_TIMEOUT_MS = 9000;
const RETRY_DELAY_MS = 1600;

function ensureOverlay() {
  let overlay = document.querySelector('#startupReadinessOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'startupReadinessOverlay';
  overlay.className = 'cloud-loading-overlay startup-readiness-overlay';
  overlay.innerHTML = `
    <div class="cloud-loading-card startup-readiness-card">
      <span>M</span>
      <strong>Preparando conexão segura...</strong>
      <small>Conectando ao MEG e ao banco de dados antes de solicitar seu acesso.</small>
      <button type="button" class="button hidden" data-startup-retry>Tentar novamente</button>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function setStatus(title, detail, retry = false) {
  const overlay = ensureOverlay();
  overlay.querySelector('strong').textContent = title;
  overlay.querySelector('small').textContent = detail;
  const button = overlay.querySelector('[data-startup-retry]');
  button.classList.toggle('hidden', !retry);
  overlay.classList.remove('hidden');
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
    // 401 is expected without a session and proves that the API and database path are awake.
    return response.status === 401 || response.ok || response.status === 403;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function waitUntilReady() {
  setStatus('Preparando conexão segura...', 'Acordando os serviços e validando a conexão com o banco de dados.');
  let attempt = 0;
  while (attempt < 4) {
    attempt += 1;
    if (await probeApi()) {
      setStatus('Conexão pronta', 'Agora você pode entrar com biometria, usuário e senha.');
      await new Promise((resolve) => window.setTimeout(resolve, 280));
      document.querySelector('#startupReadinessOverlay')?.classList.add('hidden');
      document.body.classList.add('meg-api-ready');
      return true;
    }
    if (attempt < 4) {
      setStatus('Servidor iniciando...', `Tentativa ${attempt} de 4. Aguarde enquanto a conexão é preparada.`);
      await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  setStatus('Não foi possível conectar', 'Verifique sua internet e tente novamente. O login será liberado somente quando a conexão estiver pronta.', true);
  return new Promise((resolve) => {
    const button = document.querySelector('[data-startup-retry]');
    button?.addEventListener('click', async () => {
      button.disabled = true;
      button.classList.add('hidden');
      const ready = await waitUntilReady();
      button.disabled = false;
      resolve(ready);
    }, { once: true });
  });
}

export const apiReadiness = (() => {
  if (import.meta.env.VITE_VALIDATION_MODE === 'true' || new URLSearchParams(location.search).get('validacao') === '1') {
    return Promise.resolve(true);
  }
  return waitUntilReady();
})();

window.MEG_API_READY = apiReadiness;
