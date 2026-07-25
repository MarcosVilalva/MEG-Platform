const FILTER_SELECTOR = '#transactions .column-filter-row select:not(.meg-hidden-date-sort)';
let active = null;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function columnTitle(select) {
  const cell = select.closest('th');
  const index = [...cell.parentElement.children].indexOf(cell);
  const header = select.closest('table')?.querySelector(`thead tr:first-child th:nth-child(${index + 1})`);
  return header?.textContent?.trim() || select.getAttribute('aria-label') || 'Filtro';
}

function selectedValues(select) {
  return new Set([...select.options].filter((option) => option.selected).map((option) => option.value));
}

function closeFilter({ restoreFocus = false } = {}) {
  if (!active) return;
  const { popover, select } = active;
  popover.remove();
  select.classList.remove('meg-filter-open');
  active = null;
  if (restoreFocus) select.focus({ preventScroll: true });
}

function positionPopover(popover, select) {
  const rect = select.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(360, window.innerWidth - margin * 2);
  let left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
  let top = rect.bottom + 8;
  const estimatedHeight = Math.min(520, window.innerHeight - margin * 2);
  if (top + estimatedHeight > window.innerHeight - margin) top = Math.max(margin, rect.top - estimatedHeight - 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function openFilter(select) {
  if (active?.select === select) return closeFilter({ restoreFocus: true });
  closeFilter();
  const options = [...select.options].filter((option) => option.value !== '');
  const original = selectedValues(select);
  const working = new Set(original);
  const title = columnTitle(select);
  const popover = document.createElement('section');
  popover.className = 'meg-excel-filter-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `Filtro de ${title}`);
  popover.innerHTML = `
    <div class="meg-excel-filter-head"><strong>Filtrar ${escapeHtml(title)}</strong><span class="meg-excel-filter-count"></span></div>
    <div class="meg-excel-filter-search-wrap"><input type="search" placeholder="Pesquisar valores" autocomplete="off" aria-label="Pesquisar valores"></div>
    <div class="meg-excel-filter-options" role="listbox" aria-multiselectable="true"></div>
    <div class="meg-excel-filter-actions"><button type="button" data-action="clear">Limpar</button><button type="button" data-action="cancel">Cancelar</button><button type="button" class="meg-excel-apply" data-action="apply">Aplicar</button></div>`;
  document.body.append(popover);
  select.classList.add('meg-filter-open');
  active = { popover, select, original, working };
  positionPopover(popover, select);

  const search = popover.querySelector('input[type=search]');
  const list = popover.querySelector('.meg-excel-filter-options');
  const count = popover.querySelector('.meg-excel-filter-count');

  const render = () => {
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const visible = options.filter((option) => option.textContent.toLocaleLowerCase('pt-BR').includes(query));
    const visibleValues = visible.map((option) => option.value);
    const allVisibleSelected = visibleValues.length > 0 && visibleValues.every((value) => working.has(value));
    list.innerHTML = `
      <label class="meg-excel-filter-option is-all"><input type="checkbox" data-select-all ${allVisibleSelected ? 'checked' : ''}><span>Selecionar tudo${query ? ' (resultados)' : ''}</span><small>${visible.length}</small></label>
      ${visible.map((option) => `<label class="meg-excel-filter-option"><input type="checkbox" value="${escapeHtml(option.value)}" ${working.has(option.value) ? 'checked' : ''}><span title="${escapeHtml(option.textContent)}">${escapeHtml(option.textContent)}</span></label>`).join('') || '<div class="meg-excel-filter-empty">Nenhum valor encontrado.</div>'}`;
    count.textContent = working.size ? `${working.size} selecionado(s)` : 'Nenhum selecionado';
  };

  search.addEventListener('input', render);
  list.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type=checkbox]');
    if (!checkbox) return;
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const visible = options.filter((option) => option.textContent.toLocaleLowerCase('pt-BR').includes(query));
    if (checkbox.hasAttribute('data-select-all')) {
      visible.forEach((option) => checkbox.checked ? working.add(option.value) : working.delete(option.value));
    } else if (checkbox.checked) working.add(checkbox.value); else working.delete(checkbox.value);
    render();
  });

  popover.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'cancel') return closeFilter({ restoreFocus: true });
    if (action === 'clear') {
      working.clear();
      const fallback = options.find((option) => /^(todos|todas)$/i.test(option.textContent.trim()));
      if (fallback) working.add(fallback.value);
      render();
      return;
    }
    if (action === 'apply') {
      const hasAll = options.some((option) => /^(todos|todas)$/i.test(option.textContent.trim()) && working.has(option.value));
      [...select.options].forEach((option) => {
        option.selected = hasAll ? /^(todos|todas)$/i.test(option.textContent.trim()) : working.has(option.value);
      });
      if (!select.multiple && !select.selectedOptions.length && select.options.length) select.options[0].selected = true;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeFilter({ restoreFocus: true });
    }
  });

  render();
  window.setTimeout(() => search.focus(), 0);
}

function bindSelect(select) {
  if (select.dataset.megExcelFilter === 'true') return;
  select.dataset.megExcelFilter = 'true';
  select.setAttribute('aria-haspopup', 'dialog');
  select.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openFilter(select);
  });
  select.addEventListener('keydown', (event) => {
    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      openFilter(select);
    }
  });
}

function bindAll() {
  document.querySelectorAll(FILTER_SELECTOR).forEach(bindSelect);
}

document.addEventListener('pointerdown', (event) => {
  if (!active) return;
  if (event.target.closest('.meg-excel-filter-popover') || event.target === active.select) return;
  closeFilter();
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && active) closeFilter({ restoreFocus: true });
});

window.addEventListener('resize', () => active && positionPopover(active.popover, active.select));
window.addEventListener('scroll', () => active && positionPopover(active.popover, active.select), true);

const observer = new MutationObserver(bindAll);
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindAll, { once: true }); else bindAll();
