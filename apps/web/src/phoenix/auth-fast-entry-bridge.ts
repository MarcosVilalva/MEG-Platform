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
    transition.dataset.bootFidelity = 'approved-v5';
    transition.innerHTML = `
      <section class="px-preview-boot-v5" aria-label="Carregando seu ambiente. 22% concluído. Validando sua sessão.">
        <div class="px-preview-boot-v5-visual" style="--boot-progress:22%">
          <span class="px-preview-boot-v5-ring" aria-hidden="true"></span>
          <span class="px-preview-boot-v5-ring-soft" aria-hidden="true"></span>
          <img src="${brandMark}" alt="MEG">
        </div>
        <div class="px-preview-boot-v5-progress" aria-label="22% preparado">
          <div class="px-preview-boot-v5-track"><span style="width:22%"></span></div>
          <strong>22%</strong>
        </div>
        <div class="px-preview-boot-v5-copy">
          <strong>Carregando seu ambiente</strong>
          <span class="px-preview-boot-v5-stage">Validando sua sessão</span>
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
