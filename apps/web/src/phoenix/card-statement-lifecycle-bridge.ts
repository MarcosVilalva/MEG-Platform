import { cardsClient, type CardStatementLifecycle } from '../app/cards-client';
import './phoenix-card-statement-lifecycle.css';

const monthNumbers: Record<string, string> = {
  jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
  abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
  ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
  dez: '12', dezembro: '12'
};

let observer: MutationObserver | null = null;
let syncTimer: number | null = null;
let loadedKey = '';
let loadingKey = '';
let requestSerial = 0;
let lifecycle: CardStatementLifecycle | null = null;
const cache = new Map<string, CardStatementLifecycle>();

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function currentMonthFallback() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value || '2026';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  return `${year}-${month}`;
}

function monthFromText(value: string) {
  const cleaned = normalize(value).replace(/[.,]/g, ' ');
  const iso = cleaned.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const year = cleaned.match(/\b(20\d{2})\b/)?.[1];
  if (!year) return '';
  const token = cleaned.split(/[^a-z0-9çã]+/).find((item) => monthNumbers[item]);
  return token ? `${year}-${monthNumbers[token]}` : '';
}

function activeMonth() {
  const label = document.querySelector<HTMLElement>('.px-period-active')?.textContent || '';
  return monthFromText(label) || currentMonthFallback();
}

function selectedCardName() {
  return document.querySelector<HTMLElement>('.px-card-account h2')?.textContent?.trim() || '';
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(parsed) ? parsed : 0);
}

function brDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(parsed);
}

function actorName(actor: CardStatementLifecycle['reopenedBy']) {
  return actor?.name || actor?.email || actor?.id || 'Usuário MEG';
}

function statusMeta(value: CardStatementLifecycle['status']) {
  return ({
    none: { label: 'SEM FATURA', className: 'confirmed', note: 'Nenhuma parcela oficial nesta competência.' },
    open: { label: 'EM ABERTO', className: 'planned', note: 'Há parcelas oficiais aguardando pagamento.' },
    partial: { label: 'PARCIAL', className: 'planned', note: 'Parte da fatura já foi paga e ainda existe saldo oficial em aberto.' },
    paid: { label: 'PAGA', className: 'reconciled', note: 'As parcelas oficiais desta competência estão quitadas.' },
    reopened: { label: 'REABERTA', className: 'warn', note: 'O pagamento foi estornado de forma auditada e as parcelas voltaram para aberto.' }
  } as const)[value];
}

function shortId(value: string | null | undefined) {
  if (!value) return '—';
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;
}

function panelHost() {
  return document.querySelector<HTMLElement>('.px-card-hero');
}

function removePanel() {
  document.querySelector('[data-card-statement-lifecycle]')?.remove();
}

function overrideReactStatus(item: CardStatementLifecycle) {
  const badge = document.querySelector<HTMLElement>('.px-cycle-dates .px-status');
  if (!badge) return;
  const meta = statusMeta(item.status);
  const desiredClass = `px-status ${meta.className}`;
  if (badge.textContent !== meta.label) badge.textContent = meta.label;
  if (badge.className !== desiredClass) badge.className = desiredClass;
  if (badge.dataset.statementLifecycleStatus !== item.status) badge.dataset.statementLifecycleStatus = item.status;
}

function panelHtml(item: CardStatementLifecycle) {
  const meta = statusMeta(item.status);
  const payment = item.lastPayment;
  const event = payment?.event || null;
  const eventArchived = Boolean(event?.archivedAt || event?.status === 'archived');
  const linkedPayment = payment
    ? `<div class="px-statement-life-payment">
        <div><span>Último pagamento</span><strong>${escapeHtml(brDate(payment.paidAt))}</strong><small>${escapeHtml(actorName(payment.actor))}</small></div>
        <div><span>Valor baixado</span><strong>${escapeHtml(money(payment.amount))}</strong><small>${payment.auditId ? `AuditLog ${escapeHtml(shortId(payment.auditId))}` : 'Baixa anterior à trilha completa'}</small></div>
        <div><span>Conta utilizada</span><strong>${escapeHtml(payment.account?.name || 'Não identificada')}</strong><small>${escapeHtml(payment.account?.institution || payment.account?.type || '—')}</small></div>
        <div><span>Forma</span><strong>${escapeHtml(payment.paymentMethod?.name || 'Não identificada')}</strong><small>${escapeHtml(payment.paymentMethod?.type || '—')}</small></div>
      </div>`
    : `<div class="px-statement-life-empty"><strong>Nenhum pagamento oficial vinculado</strong><span>${escapeHtml(meta.note)}</span></div>`;
  const reopen = item.status === 'reopened'
    ? `<div class="px-statement-life-reopen"><div><strong>Fatura reaberta em ${escapeHtml(brDate(item.reopenedAt, true))}</strong><span>por ${escapeHtml(actorName(item.reopenedBy))}</span></div><p>${escapeHtml(item.reopenReason || 'Motivo preservado na auditoria.')}</p></div>`
    : '';
  const eventLink = event
    ? `<div class="px-statement-life-link"><div><span>Lançamento monetário vinculado</span><strong title="${escapeHtml(event.id)}">${escapeHtml(event.description || `Evento ${shortId(event.id)}`)}</strong><small>ID ${escapeHtml(shortId(event.id))}${eventArchived ? ' · arquivado após reabertura' : ''}</small></div>${eventArchived ? '<span class="px-statement-life-archived">ARQUIVADO</span>' : '<button type="button" class="px-secondary-action" data-statement-life-open-event>Abrir lançamento</button>'}</div>`
    : '';
  return `<section class="px-statement-lifecycle" data-card-statement-lifecycle>
    <div class="px-statement-life-head"><div><span>Ciclo da fatura</span><strong>${escapeHtml(item.cardName)} · ${escapeHtml(item.month)}</strong><small>${escapeHtml(meta.note)}</small></div><span class="px-status ${meta.className}">${escapeHtml(meta.label)}</span></div>
    <div class="px-statement-life-totals">
      <div><span>Fatura oficial</span><strong>${escapeHtml(money(item.statementAmount))}</strong><small>${item.openInstallments + item.paidInstallments} parcela(s)</small></div>
      <div><span>Em aberto</span><strong>${escapeHtml(money(item.openAmount))}</strong><small>${item.openInstallments} parcela(s)</small></div>
      <div><span>Já pago</span><strong>${escapeHtml(money(item.paidAmount))}</strong><small>${item.paidInstallments} parcela(s)</small></div>
    </div>
    ${linkedPayment}
    ${reopen}
    ${eventLink}
    <div class="px-statement-life-footer"><span>${item.lifecycleAuditId ? `Último vínculo de auditoria ${escapeHtml(shortId(item.lifecycleAuditId))}` : 'Sem ação de pagamento/reabertura na auditoria desta competência.'}</span><button type="button" class="px-secondary-action" data-statement-life-open-history>Abrir no Histórico</button></div>
  </section>`;
}

function bindPanel(item: CardStatementLifecycle) {
  const panel = document.querySelector<HTMLElement>('[data-card-statement-lifecycle]');
  if (!panel) return;
  panel.querySelector<HTMLButtonElement>('[data-statement-life-open-history]')?.addEventListener('click', () => openHistory(item));
  panel.querySelector<HTMLButtonElement>('[data-statement-life-open-event]')?.addEventListener('click', () => openMovement(item));
}

function render(item: CardStatementLifecycle) {
  const host = panelHost();
  if (!host) return;
  overrideReactStatus(item);
  removePanel();
  host.insertAdjacentHTML('beforeend', panelHtml(item));
  bindPanel(item);
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function navButton(label: string) {
  const needle = normalize(label);
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => normalize(button.textContent) === needle || normalize(button.textContent).includes(needle)) || null;
}

function waitFor<T>(read: () => T | null, attempts = 50, delay = 80): Promise<T | null> {
  return new Promise((resolve) => {
    let count = 0;
    const tick = () => {
      const result = read();
      if (result || count >= attempts) {
        resolve(result);
        return;
      }
      count += 1;
      window.setTimeout(tick, delay);
    };
    tick();
  });
}

async function openHistory(item: CardStatementLifecycle) {
  const button = navButton('Histórico');
  if (!button) return;
  button.click();
  const input = await waitFor(() => document.querySelector<HTMLInputElement>('.px-history-toolbar .px-search-field input'));
  if (input) {
    setNativeValue(input, item.cardId);
    input.focus();
  }
}

async function chooseMonth(targetMonth: string) {
  if (activeMonth() === targetMonth) return true;
  document.querySelector<HTMLButtonElement>('.px-period-summary')?.click();
  const popover = await waitFor(() => document.querySelector<HTMLElement>('.px-period-popover-v15'));
  if (!popover) return false;
  const monthMode = [...popover.querySelectorAll<HTMLButtonElement>('.px-period-modes button')].find((button) => normalize(button.textContent) === 'mes');
  monthMode?.click();
  const input = await waitFor(() => document.querySelector<HTMLInputElement>('.px-period-popover-v15 input[type="month"]'));
  if (!input) return false;
  setNativeValue(input, targetMonth);
  document.querySelector<HTMLButtonElement>('.px-period-popover-v15 .px-period-apply')?.click();
  const changed = await waitFor(() => activeMonth() === targetMonth ? document.querySelector<HTMLElement>('.px-period-active') : null, 80, 100);
  return Boolean(changed);
}

async function openMovement(item: CardStatementLifecycle) {
  const event = item.lastPayment?.event;
  if (!event || event.archivedAt || event.status === 'archived') return;
  const button = navButton('Lançamentos');
  if (!button) return;
  button.click();
  const targetMonth = event.date?.slice(0, 7) || item.month;
  await chooseMonth(targetMonth);
  const input = await waitFor(() => document.querySelector<HTMLInputElement>('.px-screen .px-toolbar .px-search-field input[placeholder*="Buscar descrição"]'));
  if (input && event.description) {
    setNativeValue(input, event.description);
    input.focus();
  }
}

async function loadLifecycle(force = false) {
  const name = selectedCardName();
  const month = activeMonth();
  if (!name || !document.querySelector('.px-card-hero')) {
    loadedKey = '';
    lifecycle = null;
    removePanel();
    return;
  }
  const key = `${month}|${normalize(name)}`;
  if (!force && loadedKey === key && lifecycle) {
    if (!document.querySelector('[data-card-statement-lifecycle]')) render(lifecycle);
    else overrideReactStatus(lifecycle);
    return;
  }
  const cached = !force ? cache.get(key) : null;
  if (cached) {
    loadedKey = key;
    lifecycle = cached;
    render(cached);
    return;
  }
  if (!force && loadingKey === key) return;

  loadingKey = key;
  const serial = ++requestSerial;
  try {
    const cards = await cardsClient.list(month);
    if (serial !== requestSerial) return;
    const card = cards.find((candidate) => normalize(candidate.name) === normalize(name));
    if (!card) return;
    const result = await cardsClient.statementLifecycle(card.id, month);
    if (serial !== requestSerial || selectedCardName() !== name || activeMonth() !== month) return;
    cache.set(key, result);
    loadedKey = key;
    lifecycle = result;
    render(result);
  } catch {
    // A tela principal continua utilizável se o enriquecimento do ciclo não responder.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function schedule(force = false) {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void loadLifecycle(force);
  }, 60);
}

function invalidate() {
  cache.clear();
  loadedKey = '';
  lifecycle = null;
  schedule(true);
}

function boot() {
  if (observer) return;
  observer = new MutationObserver(() => schedule(false));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('meg:data-invalidated', invalidate as EventListener);
  schedule(false);
}

boot();
