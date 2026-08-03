export const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MAX_OPTIONS = 250;
let activePopover = null;
let activeButton = null;

export function parseBrazilianNumber(value) {
  const text = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const number = Number(text);
  return Number.isFinite(number) ? number : Number.NaN;
}

export function normalizeExactNumber(value) {
  const number = typeof value === 'number' ? value : parseBrazilianNumber(value);
  return Number.isFinite(number) ? number.toFixed(2) : '';
}

export function matchesExactNumbers(value, selected) {
  return !selected?.size || selected.has(normalizeExactNumber(value));
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function syncFilterButton(button, selected) {
  button?.classList.toggle('is-filtered', selected.size > 0);
  if (button) button.dataset.count = selected.size ? String(selected.size) : '';
}

export function closeExactPopover() {
  activePopover?.remove();
  activePopover = null;
  activeButton?.classList.remove('is-open');
  activeButton = null;
}

function positionPopover(popover, button) {
  const rect = button.getBoundingClientRect();
  const margin = 10;
  const width = Math.min(360, window.innerWidth - margin * 2);
  popover.style.width = `${width}px`;
  popover.style.left = `${Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin)}px`;
  const below = rect.bottom + 7;
  const maxHeight = Math.min(500, window.innerHeight - margin * 2);
  popover.style.top = `${below + maxHeight <= window.innerHeight - margin ? below : Math.max(margin, rect.top - maxHeight - 7)}px`;
}

export function openExactValuePopover({ label, values, selected, button, onApply, onClear, onSort }) {
  closeExactPopover();
  const working = new Set(selected);
  const popover = document.createElement('section');
  popover.className = 'meg-stable-filter-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `Filtro de ${label}`);
  popover.innerHTML = `
    <header><div><small>FILTRO DA COLUNA</small><strong>${escapeHtml(label)}</strong></div><button type="button" data-exact-close aria-label="Fechar">×</button></header>
    <div class="meg-stable-filter-sort"><button type="button" data-exact-sort="asc">↑ Crescente</button><button type="button" data-exact-sort="desc">↓ Decrescente</button></div>
    <div class="meg-stable-filter-body">
      <input class="meg-stable-filter-search" type="search" placeholder="Pesquisar valores" autocomplete="off">
      <label class="meg-stable-select-all"><input type="checkbox" data-exact-select-all><span>Selecionar tudo</span></label>
      <div class="meg-stable-filter-options"></div>
    </div>
    <footer><button type="button" data-exact-clear>Limpar</button><button type="button" data-exact-cancel>Cancelar</button><button type="button" class="primary" data-exact-apply>Aplicar</button></footer>`;
  document.body.append(popover);
  activePopover = popover;
  activeButton = button;
  button.classList.add('is-open');

  const search = popover.querySelector('.meg-stable-filter-search');
  const optionsBox = popover.querySelector('.meg-stable-filter-options');
  const selectAll = popover.querySelector('[data-exact-select-all]');
  const visibleValues = () => {
    const query = normalizeText(search.value);
    return values.filter((item) => !query || normalizeText(item.label).includes(query)).slice(0, MAX_OPTIONS);
  };
  const render = () => {
    const visible = visibleValues();
    optionsBox.innerHTML = visible.length
      ? visible.map((item) => `<label><input type="checkbox" value="${item.value}" ${working.has(item.value) ? 'checked' : ''}><span>${escapeHtml(item.label)}</span></label>`).join('')
      : '<p class="meg-stable-filter-empty">Nenhum valor encontrado.</p>';
    selectAll.checked = visible.length > 0 && visible.every((item) => working.has(item.value));
    selectAll.indeterminate = visible.some((item) => working.has(item.value)) && !selectAll.checked;
  };

  search.addEventListener('input', render);
  selectAll.addEventListener('change', () => {
    visibleValues().forEach((item) => selectAll.checked ? working.add(item.value) : working.delete(item.value));
    render();
  });
  optionsBox.addEventListener('change', (event) => {
    const option = event.target.closest('input[type="checkbox"]');
    if (!option) return;
    option.checked ? working.add(option.value) : working.delete(option.value);
    render();
  });
  popover.querySelector('[data-exact-apply]').addEventListener('click', () => {
    selected.clear();
    if (working.size !== values.length) working.forEach((value) => selected.add(value));
    onApply();
    syncFilterButton(button, selected);
    closeExactPopover();
  });
  popover.querySelector('[data-exact-clear]').addEventListener('click', () => {
    selected.clear();
    onClear();
    syncFilterButton(button, selected);
    closeExactPopover();
  });
  popover.querySelector('[data-exact-cancel]').addEventListener('click', closeExactPopover);
  popover.querySelector('[data-exact-close]').addEventListener('click', closeExactPopover);
  popover.querySelectorAll('[data-exact-sort]').forEach((control) => control.addEventListener('click', () => {
    onSort(control.dataset.exactSort);
    closeExactPopover();
  }));
  render();
  positionPopover(popover, button);
  setTimeout(() => search.focus(), 0);
}

export function installPopoverDismissal() {
  document.addEventListener('pointerdown', (event) => {
    if (!activePopover) return;
    if (event.target.closest('.meg-stable-filter-popover') || event.target.closest('.meg-stable-filter-button')) return;
    closeExactPopover();
  }, true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeExactPopover(); });
  window.addEventListener('resize', () => {
    if (activePopover && activeButton) positionPopover(activePopover, activeButton);
  }, { passive: true });
}
