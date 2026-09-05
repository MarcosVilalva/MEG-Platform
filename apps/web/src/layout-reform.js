import './full-layout-reform.css';
import { VIEW_COPY } from './layout-reform-core.js';

export { VIEW_COPY } from './layout-reform-core.js';

function initializePeriodPanel() {
  const toggle = document.getElementById('globalPeriodToggle');
  const panel = document.getElementById('globalPeriodFilters');
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(panel.hidden);
  });
  panel.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

function reformView(view) {
  const copy = VIEW_COPY[view.id];
  if (!copy) return;
  const heading = view.querySelector(':scope > .section-heading');
  if (!heading) return;

  heading.classList.add('meg-page-heading');
  let copyWrap = heading.querySelector(':scope > div');
  if (!copyWrap) {
    copyWrap = document.createElement('div');
    const title = heading.querySelector(':scope > h2');
    if (title) copyWrap.append(title);
    heading.prepend(copyWrap);
  }
  copyWrap.classList.add('meg-page-heading-copy');

  let eyebrow = copyWrap.querySelector(':scope > .eyebrow');
  if (!eyebrow) {
    eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    copyWrap.prepend(eyebrow);
  }
  eyebrow.textContent = copy[0];

  const title = copyWrap.querySelector(':scope > h2');
  if (title) title.textContent = copy[1];

  let subtitle = copyWrap.querySelector(':scope > .meg-page-subtitle');
  if (!subtitle) {
    subtitle = document.createElement('p');
    subtitle.className = 'muted meg-page-subtitle';
    copyWrap.append(subtitle);
  }
  subtitle.textContent = copy[2];

  [...heading.children].filter((element) => element !== copyWrap).forEach((element) => element.classList.add('meg-page-actions'));
}

function labelContentSections() {
  document.querySelectorAll('main.content > .view').forEach((view) => {
    reformView(view);
    [...view.children].forEach((element) => {
      if (element.matches('section, article') && !element.classList.contains('meg-page-heading')) {
        element.classList.add('meg-content-section');
      }
      if (element.matches('[class*="grid"]')) element.classList.add('meg-content-grid');
    });
  });
}

function synchronizeActiveView() {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== 'attributes') continue;
      const view = record.target;
      if (view.classList.contains('active')) document.body.dataset.activeView = view.id;
    }
  });
  document.querySelectorAll('main.content > .view').forEach((view) => observer.observe(view, { attributes: true, attributeFilter: ['class'] }));
  document.body.dataset.activeView = document.querySelector('main.content > .view.active')?.id || 'dashboard';
}

export function initializeLayoutReform() {
  document.body.classList.add('meg-layout-reformed');
  initializePeriodPanel();
  labelContentSections();
  synchronizeActiveView();
}
