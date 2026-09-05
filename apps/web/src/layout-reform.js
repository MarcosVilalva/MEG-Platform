import './full-layout-reform.css';
import { formatPeriodSummary, VIEW_COPY } from './layout-reform-core.js';

export { VIEW_COPY } from './layout-reform-core.js';

function initializePeriodPanel() {
  const toggle = document.getElementById('globalPeriodToggle');
  const panel = document.getElementById('globalPeriodFilters');
  const summary = document.getElementById('globalPeriodSummary');
  if (!toggle || !panel) return;

  const storageKey = 'meg-period-panel-open-v1';
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const controls = {
    mode: document.getElementById('periodMode'),
    month: document.getElementById('monthFilter'),
    year: document.getElementById('yearFilter'),
    start: document.getElementById('startDateFilter'),
    end: document.getElementById('endDateFilter'),
  };

  const updateSummary = () => {
    const mode = controls.mode?.value || 'month';
    const text = formatPeriodSummary({
      mode,
      month: controls.month?.value,
      year: controls.year?.value,
      start: controls.start?.value,
      end: controls.end?.value,
    });
    if (summary) summary.textContent = text;
    toggle.classList.toggle('has-active-filter', mode !== 'all');
    toggle.setAttribute('aria-label', `${panel.hidden ? 'Abrir' : 'Fechar'} filtros. Período: ${text}`);
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    try { localStorage.setItem(storageKey, open ? 'true' : 'false'); } catch {}
    updateSummary();
  };

  let storedOpen = false;
  try { storedOpen = localStorage.getItem(storageKey) === 'true'; } catch {}
  setOpen(mobileQuery.matches && storedOpen);

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(panel.hidden);
  });
  panel.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  Object.values(controls).forEach((control) => control?.addEventListener('change', () => {
    window.setTimeout(() => {
      updateSummary();
      if (mobileQuery.matches && control !== controls.mode) setOpen(false);
      if (mobileQuery.matches && control === controls.mode && control.value === 'all') setOpen(false);
    }, 0);
  }));
  mobileQuery.addEventListener?.('change', () => setOpen(false));
  window.setTimeout(updateSummary, 0);
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
