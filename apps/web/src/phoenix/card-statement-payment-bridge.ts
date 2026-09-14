import { cardsClient, type CreditCard } from '../app/cards-client';
import { financeClient, type Account, type PaymentMethod } from '../app/finance-client';
import './phoenix-card-statement-payment.css';

type StatementContext = {
  month: string;
  card: CreditCard;
};

const monthNumbers: Record<string, string> = {
  jan: '01', janeiro: '01',
  fev: '02', fevereiro: '02',
  mar: '03', marco: '03', março: '03',
  abr: '04', abril: '04',
  mai: '05', maio: '05',
  jun: '06', junho: '06',
  jul: '07', julho: '07',
  ago: '08', agosto: '08',
  set: '09', setembro: '09',
  out: '10', outubro: '10',
  nov: '11', novembro: '11',
  dez: '12', dezembro: '12',
};

let observer: MutationObserver | null = null;
let syncTimer: number | null = null;
let loadedKey = '';
let loadingKey = '';
let context: StatementContext | null = null;
let catalogs: { accounts: Account[]; methods: PaymentMethod[] } | null = null;
let paymentOperation: { key: string; operationId: string } | null = null;
let requestSerial = 0;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
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

function addMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function statementDueIso(card: CreditCard, statementMonth: string) {
  const dueMonth = card.dueDay <= card.closingDay ? addMonth(statementMonth, 1) : statementMonth;
  const [year, month] = dueMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.max(1, Math.min(lastDay, Number(card.dueDay || 1)));
  return `${dueMonth}-${String(day).padStart(2, '0')}`;
}

function brDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function parseMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function payableAmount(card: CreditCard) {
  if (card.payableStatementAmount !== undefined) return Math.max(0, parseMoney(card.payableStatementAmount));
  return card.purchases.flatMap((purchase) => purchase.entries)
    .filter((entry) => entry.statementMonth === context?.month && normalize(entry.status) === 'open')
    .reduce((sum, entry) => sum + parseMoney(entry.amount), 0);
}

function legacyResidual(card: CreditCard) {
  return Math.max(0, parseMoney(card.statementAmount) - payableAmount(card));
}

function isMonetaryAccount(account: Account) {
  if (!account.isActive) return false;
  const marker = normalize(`${account.type} ${account.name}`);
  return !marker.includes('benef') && !marker.includes('verocard');
}

function operationId(key: string) {
  if (paymentOperation?.key === key) return paymentOperation.operationId;
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  paymentOperation = { key, operationId: `phoenix-card-statement:${uuid}` };
  return paymentOperation.operationId;
}

function paymentButton() {
  return [...document.querySelectorAll<HTMLButtonElement>('.px-card-movement .px-panel-head button')]
    .find((button) => normalize(button.textContent).includes('pagamento da fatura') || button.dataset.phoenixStatementPay === 'true') || null;
}

function setInlineStatus(text: string, warn = false) {
  const panel = document.querySelector<HTMLElement>('.px-card-movement');
  if (!panel) return;
  let node = panel.querySelector<HTMLElement>('[data-phoenix-statement-status]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.phoenixStatementStatus = 'true';
    panel.querySelector('.px-tabbar')?.insertAdjacentElement('beforebegin', node);
  }
  node.className = `px-statement-inline-status ${warn ? 'warn' : 'ok'}`;
  node.textContent = text;
}

function decorateCurrentStatement(item: StatementContext) {
  const amount = payableAmount(item.card);
  const legacy = legacyResidual(item.card);
  const due = statementDueIso(item.card, item.month);
  const firstMetric = document.querySelector<HTMLElement>('.px-card-metrics > div:first-child');
  if (firstMetric) {
    let dueNode = firstMetric.querySelector<HTMLElement>('[data-card-statement-due]');
    if (!dueNode) {
      dueNode = document.createElement('small');
      dueNode.dataset.cardStatementDue = 'true';
      firstMetric.append(dueNode);
    }
    const suffix = legacy > 0 ? ` · ${money(legacy)} legado em leitura` : '';
    dueNode.textContent = `Vence em ${brDate(due)} · baixável ${money(amount)}${suffix}`;
  }

  const cycle = document.querySelector<HTMLElement>('.px-cycle-dates');
  if (cycle) {
    let exact = cycle.querySelector<HTMLElement>('[data-card-exact-due]');
    if (!exact) {
      exact = document.createElement('div');
      exact.dataset.cardExactDue = 'true';
      const status = cycle.querySelector('.px-status');
      if (status) cycle.insertBefore(exact, status);
      else cycle.append(exact);
    }
    exact.innerHTML = `<span>Vencimento da fatura</span><strong>${brDate(due)}</strong>`;
  }

  const button = paymentButton();
  if (button) {
    button.dataset.phoenixStatementPay = 'true';
    button.disabled = amount <= 0;
    button.textContent = amount > 0 ? `Pagar fatura · ${money(amount)}` : 'Fatura sem saldo a pagar';
    button.title = amount > 0
      ? `Registrar o pagamento monetário da fatura com vencimento em ${brDate(due)}`
      : legacy > 0 ? 'Há valores legados em leitura, mas nenhuma parcela do domínio está aberta para baixa.' : 'Não há parcelas abertas nesta fatura.';
  }
}

function decorateFutureStatements(item: StatementContext) {
  document.querySelectorAll<HTMLElement>('.px-future-grid article').forEach((article) => {
    const label = article.querySelector<HTMLElement>('span')?.textContent || '';
    const month = monthFromText(label);
    if (!month) return;
    let due = article.querySelector<HTMLElement>('[data-card-future-due]');
    if (!due) {
      due = document.createElement('small');
      due.dataset.cardFutureDue = 'true';
      article.append(due);
    }
    due.textContent = `Vencimento ${brDate(statementDueIso(item.card, month))}`;
  });
}

function decorate() {
  if (!context) return;
  const name = selectedCardName();
  if (!name || normalize(name) !== normalize(context.card.name) || activeMonth() !== context.month) return;
  decorateCurrentStatement(context);
  decorateFutureStatements(context);
}

async function loadContext(force = false) {
  const name = selectedCardName();
  const month = activeMonth();
  if (!name || !document.querySelector('.px-card-movement')) {
    loadedKey = '';
    context = null;
    return;
  }
  const key = `${month}|${normalize(name)}`;
  if (!force && loadedKey === key && context) {
    decorate();
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
    loadedKey = key;
    context = { month, card };
    decorate();
  } catch {
    // A tela React continua utilizável mesmo se o enriquecimento de fatura falhar.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

async function loadCatalogs() {
  if (catalogs) return catalogs;
  const [accounts, methods] = await Promise.all([financeClient.listAccounts(), financeClient.listPaymentMethods()]);
  catalogs = { accounts, methods };
  return catalogs;
}

function closePayment() {
  document.querySelector('[data-card-statement-payment]')?.remove();
  document.querySelector('[data-card-statement-payment-backdrop]')?.remove();
}

function paymentRoot() {
  return document.querySelector<HTMLElement>('[data-card-statement-payment]');
}

function defaultAccount(accounts: Account[]) {
  return accounts.find((account) => normalize(account.name).includes('principal')) || accounts[0] || null;
}

function defaultMethod(methods: PaymentMethod[]) {
  return methods.find((method) => normalize(method.name).includes('pix'))
    || methods.find((method) => normalize(method.name).includes('transfer'))
    || methods[0]
    || null;
}

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function paymentFeedback(text: string, warn = false) {
  const node = paymentRoot()?.querySelector<HTMLElement>('[data-statement-payment-feedback]');
  if (!node) return;
  node.className = `px-notice ${warn ? 'warn' : 'ok'}`;
  node.textContent = text;
}

async function openPayment() {
  await loadContext(true);
  const item = context;
  if (!item) return;
  const amount = payableAmount(item.card);
  if (amount <= 0) {
    setInlineStatus('Esta fatura não possui parcelas abertas no domínio de cartões.', true);
    return;
  }

  let loaded;
  try {
    loaded = await loadCatalogs();
  } catch (error) {
    setInlineStatus(error instanceof Error ? error.message : 'Não foi possível carregar as contas para pagamento.', true);
    return;
  }
  const accounts = loaded.accounts.filter(isMonetaryAccount);
  const methods = loaded.methods.filter((method) => method.isActive);
  if (!accounts.length) {
    setInlineStatus('Nenhuma conta monetária ativa está disponível. Cadastre ou reative uma conta antes de pagar a fatura.', true);
    return;
  }

  closePayment();
  const account = defaultAccount(accounts);
  const method = defaultMethod(methods);
  const due = statementDueIso(item.card, item.month);
  const legacy = legacyResidual(item.card);
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'px-launch-backdrop';
  backdrop.dataset.cardStatementPaymentBackdrop = 'true';
  backdrop.setAttribute('aria-label', 'Fechar pagamento da fatura');
  backdrop.addEventListener('click', closePayment);

  const drawer = document.createElement('aside');
  drawer.className = 'px-launch-drawer px-card-statement-payment';
  drawer.dataset.cardStatementPayment = 'true';
  drawer.innerHTML = `<div class="px-drawer-head"><div><span class="px-kicker">Cartões / faturas</span><h2>Pagar fatura</h2></div><button class="px-icon-btn" type="button" data-statement-payment-close>×</button></div>
    <div class="px-statement-payment-body">
      <div class="px-statement-payment-summary">
        <div><span>Cartão</span><strong>${escapeHtml(item.card.name)}</strong></div>
        <div><span>Fatura</span><strong>${escapeHtml(item.month)}</strong></div>
        <div><span>Vencimento real</span><strong>${escapeHtml(brDate(due))}</strong></div>
        <div class="emphasis"><span>Valor a pagar</span><strong>${escapeHtml(money(amount))}</strong></div>
      </div>
      <div class="px-notice ok">O pagamento cria uma única despesa monetária. As compras do cartão continuam no domínio de faturas e não movimentam o caixa novamente.</div>
      ${legacy > 0 ? `<div class="px-notice warn">Há ${escapeHtml(money(legacy))} em lançamentos legados exibidos nesta fatura. Esse valor permanece somente em leitura e não será baixado por esta rotina.</div>` : ''}
      <label class="px-field"><span>Conta de pagamento *</span><select data-statement-account>${accounts.map((itemAccount) => `<option value="${escapeHtml(itemAccount.id)}"${itemAccount.id === account?.id ? ' selected' : ''}>${escapeHtml(itemAccount.name)}${itemAccount.institution ? ` · ${escapeHtml(itemAccount.institution)}` : ''}</option>`).join('')}</select></label>
      <label class="px-field"><span>Forma de pagamento</span><select data-statement-method><option value="">Não informado</option>${methods.map((itemMethod) => `<option value="${escapeHtml(itemMethod.id)}"${itemMethod.id === method?.id ? ' selected' : ''}>${escapeHtml(itemMethod.name)}</option>`).join('')}</select></label>
      <label class="px-field"><span>Data do pagamento *</span><input type="date" data-statement-paid-at value="${todayIso()}"></label>
      <div class="px-notice" data-statement-payment-feedback>Revise a conta, a forma e a data. A confirmação registra o pagamento e baixa todas as parcelas abertas desta fatura.</div>
      <div class="px-statement-payment-actions"><button class="px-secondary-action" type="button" data-statement-payment-close>Cancelar</button><button class="px-primary-action" type="button" data-statement-payment-save>Confirmar pagamento</button></div>
    </div>`;
  document.body.append(backdrop, drawer);
  drawer.querySelectorAll('[data-statement-payment-close]').forEach((node) => node.addEventListener('click', closePayment));
  drawer.querySelector('[data-statement-payment-save]')?.addEventListener('click', () => void submitPayment(item));
}

async function submitPayment(item: StatementContext) {
  const root = paymentRoot();
  if (!root) return;
  const accountId = root.querySelector<HTMLSelectElement>('[data-statement-account]')?.value || '';
  const paymentMethodId = root.querySelector<HTMLSelectElement>('[data-statement-method]')?.value || '';
  const paidAt = root.querySelector<HTMLInputElement>('[data-statement-paid-at]')?.value || '';
  const button = root.querySelector<HTMLButtonElement>('[data-statement-payment-save]');
  if (!accountId || !paidAt) {
    paymentFeedback('Selecione uma conta monetária e informe a data do pagamento.', true);
    return;
  }

  const draftKey = `${item.card.id}|${item.month}|${accountId}|${paymentMethodId}|${paidAt}`;
  if (button) {
    button.disabled = true;
    button.textContent = 'Confirmando…';
  }
  paymentFeedback('Registrando o pagamento e baixando a fatura de forma atômica…');
  try {
    const result = await cardsClient.payStatement(item.card.id, item.month, {
      accountId,
      paymentMethodId: paymentMethodId || undefined,
      paidAt,
      operationId: operationId(draftKey),
    });
    paymentOperation = null;
    closePayment();
    setInlineStatus(`Pagamento confirmado: ${money(Number(result.amount || 0))}. Atualizando fatura, limite e caixa…`);
    loadedKey = '';
    context = null;
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', {
      detail: { path: `/cards/${item.card.id}/statements/${item.month}/pay`, method: 'POST', domain: 'cards', source: 'statement-payment' }
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível confirmar o pagamento.';
    if (message.includes('EMPTY_STATEMENT')) {
      paymentOperation = null;
      closePayment();
      setInlineStatus('A fatura já não possui parcelas abertas. Atualizando a fotografia para confirmar o estado atual.');
      loadedKey = '';
      context = null;
      window.dispatchEvent(new CustomEvent('meg:data-invalidated', {
        detail: { path: `/cards/${item.card.id}/statements/${item.month}/pay`, method: 'POST', domain: 'cards', source: 'statement-payment-reconcile' }
      }));
      return;
    }
    if (button) {
      button.disabled = false;
      button.textContent = 'Tentar confirmar novamente';
    }
    paymentFeedback(`${message} Os dados foram mantidos para nova tentativa.`, true);
  }
}

function scheduleSync() {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void loadContext(false);
    decorate();
  }, 45);
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('[data-phoenix-statement-pay]');
  if (!button || button.disabled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openPayment();
}

function onInvalidated(event: Event) {
  const detail = (event as CustomEvent<{ path?: string }>).detail || {};
  if (!String(detail.path || '').startsWith('/cards')) return;
  loadedKey = '';
  context = null;
  requestSerial += 1;
  window.setTimeout(() => void loadContext(true), 160);
}

function start() {
  document.addEventListener('click', onClick, true);
  window.addEventListener('meg:data-invalidated', onInvalidated as EventListener);
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardStatementPaymentBridge() {
  observer?.disconnect();
  observer = null;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = null;
  document.removeEventListener('click', onClick, true);
  window.removeEventListener('meg:data-invalidated', onInvalidated as EventListener);
  closePayment();
}
