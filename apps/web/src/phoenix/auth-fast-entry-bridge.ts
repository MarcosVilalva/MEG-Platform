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
    transition.innerHTML = `
      <section class="px-preview-boot-card" aria-label="Validando acesso ao MEG Finanças">
        <div class="px-preview-boot-logo"><span class="px-preview-boot-orbit" aria-hidden="true"></span><img src="${brandMark}" alt="MEG Finanças"></div>
        <div class="px-preview-boot-copy"><span>MEG FINANÇAS</span><h1>Validando seu acesso</h1><p>Confirmando sua sessão segura para preparar o sistema.</p></div>
        <div class="px-preview-boot-progress" aria-label="22% preparado"><div class="px-preview-boot-track"><span style="width:22%"></span></div></div>
        <div class="px-preview-boot-steps">
          <div class="px-preview-boot-step active"><i>1</i><span>Validando sua sessão</span></div>
          <div class="px-preview-boot-step"><i>2</i><span>Carregando suas finanças</span></div>
          <div class="px-preview-boot-step"><i>3</i><span>Organizando cartões e pendências</span></div>
          <div class="px-preview-boot-step"><i>4</i><span>Tudo pronto</span></div>
        </div>
        <div class="px-preview-boot-foot"><i aria-hidden="true"></i><span>Conexão protegida · preparando o MEG</span></div>
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
