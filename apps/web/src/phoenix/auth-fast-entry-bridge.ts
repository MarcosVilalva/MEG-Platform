import { getApiHealth } from '../app/auth-client';

void getApiHealth().catch(() => undefined);

const root = document.getElementById('root');
const publicBase = import.meta.env.BASE_URL || '/';
const brandMark = `${publicBase.endsWith('/') ? publicBase : `${publicBase}/`}brand/meg-finance-system-mark.svg`;

if (root) {
  let transition: HTMLElement | null = null;

  const removeTransition = () => {
    transition?.remove();
    transition = null;
  };

  const showTransition = () => {
    if (transition) return;
    transition = document.createElement('main');
    transition.className = 'px-preview-fullscreen-boot';
    transition.setAttribute('aria-live', 'polite');
    transition.setAttribute('aria-busy', 'true');
    transition.style.position = 'fixed';
    transition.style.inset = '0';
    transition.style.zIndex = '9999';
    transition.dataset.bootFidelity = 'approved-v4';
    transition.innerHTML = `
      <section class="px-preview-boot-card" aria-label="Validando acesso ao MEG Finanças">
        <div class="px-preview-boot-brand">
          <div class="px-preview-boot-logo">
            <span class="px-preview-boot-halo" aria-hidden="true"></span>
            <span class="px-preview-boot-orbit" aria-hidden="true"></span>
            <span class="px-preview-boot-orbit is-secondary" aria-hidden="true"></span>
            <img src="${brandMark}" alt="MEG">
            <strong class="px-preview-boot-percent">22%</strong>
          </div>
          <div class="px-preview-boot-trust">
            <svg class="px-preview-boot-cloud-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 18.5h11.2a4.4 4.4 0 0 0 .6-8.8A6.7 6.7 0 0 0 5.4 8.2 4.9 4.9 0 0 0 6.4 18.5Z"></path></svg>
            <span>MEG CLOUD</span><i aria-hidden="true"></i><span>Sessão protegida</span>
          </div>
        </div>
        <div class="px-preview-boot-copy">
          <span class="px-preview-boot-stage-label"><i aria-hidden="true"></i>Validando sua sessão</span>
          <h1>Validando seu acesso</h1>
          <p>Confirmando sua sessão segura no MEG.</p>
        </div>
        <div class="px-preview-boot-progress" aria-label="22% preparado">
          <div class="px-preview-boot-track"><span style="width:22%"></span></div>
          <div class="px-preview-boot-progress-meta"><span>Preparando seu ambiente</span><strong>22%</strong></div>
        </div>
        <div class="px-preview-boot-steps">
          <div class="px-preview-boot-step active"><i>1</i><span>Validando sua sessão</span></div>
          <div class="px-preview-boot-step"><i>2</i><span>Carregando preferências</span></div>
          <div class="px-preview-boot-step"><i>3</i><span>Organizando painel</span></div>
          <div class="px-preview-boot-step"><i>4</i><span>Tudo pronto</span></div>
        </div>
        <div class="px-preview-boot-foot">
          <svg class="px-preview-boot-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
          <i aria-hidden="true"></i><span>Conexão protegida · preparando os dados antes da navegação</span>
        </div>
      </section>`;
    document.body.appendChild(transition);
  };

  const syncAuthState = () => {
    const form = root.querySelector<HTMLFormElement>('.px-preview-form');
    const reactBoot = root.querySelector('.px-preview-fullscreen-boot');
    const authError = root.querySelector('.px-preview-error');
    if (reactBoot || authError) removeTransition();
    if (!form) return;
    const busy = Boolean(form.querySelector('.px-preview-button-spinner'));
    form.toggleAttribute('inert', busy);
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
  };

  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains('px-preview-form')) return;
    const email = form.querySelector<HTMLInputElement>('input[type="email"]');
    const password = form.querySelector<HTMLInputElement>('input[autocomplete="current-password"]');
    if (!email?.value.trim() || !password?.value) return;
    form.setAttribute('inert', '');
    form.setAttribute('aria-busy', 'true');
    showTransition();
  }, true);

  new MutationObserver(syncAuthState).observe(root, { childList: true, subtree: true });
  queueMicrotask(syncAuthState);
}
