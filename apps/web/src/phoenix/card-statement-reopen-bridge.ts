import { readSession } from '../app/auth-client';
import { cardsClient, type CreditCard } from '../app/cards-client';
import './phoenix-card-statement-payment.css';

type StatementContext = {
  month: string;
  card: CreditCard;
};

const monthNumbers: Record<string, string> = {
  jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
  abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
  ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
  dez: '12', dezembro: '12',
};

let observer: MutationObserver | null = null;
let syncTimer: number | null = null;
let loadedKey = '';
let loadingKey = '';
let context: StatementContext | null = null;
let requestSerial = 0;
let reopenOperation: { key: string; operationId: string } | null = null;

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

function canReopen() {
  const role = readSession()?.user.role;
  return role === 'ADMIN' || role === 'MANAGER';
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function parseMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paidEntries(item: StatementContext) {
  return item.card.purchases.flatMap((purchase) => purchase.entries)
    .filter((entry) => entry.statementMonth === item.month && normalize(entry.status) === 'paid');
}

function paidAmount(item: StatementContext) {
  return paidEntries(item).reduce((sum, entry) => sum + parseMoney(entry.amount), 0);
}

function operationId(key: string) {
  if (reopenOperation?.key === key) return reopenOperation.operationId;
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  reopenOperation = { key, operationId: `phoenix-card-statement-reopen:${uuid}` };
  return reopenOperation.operationId;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function reopenButton() {
  return document.querySelector<HTMLButtonElement>('[data-phoenix-statement-reopen]');
}

function removeReopenButton() {
  reopenButton()?.remove();
}

function decorate() {
  if (!canReopen()) {
    removeReopenButton();
    return;
  }
  const item = context;
  const panel = document.querySelector<HTMLElement>('.px-card-movement');
  const head = panel?.querySelector<HTMLElement>('.px-panel-head');
  if (!item || !head || normalize(selectedCardName()) !== normalize(item.card.name) || activeMonth() !== item.month) {
    removeReopenButton();
    return;
  }

  const amount = paidAmount(item);
  if (amount <= 0) {
    removeReopenButton();
    return;
  }

  let button = reopenButton();
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'px-secondary-action';
    button.dataset.phoenixStatementReopen = 'true';
    button.addEventListener('click', () => void openReopen());
    head.append(button);
  }
  button.disabled = false;
  button.textContent = `Reabrir fatura · ${money(amount)}`;
  button.title = 'Estornar o pagamento registrado e devolver as parcelas desta fatura para a situação em aberto.';
}

async function loadContext(force = false) {
  const name = selectedCardName();
  const month = activeMonth();
  if (!name || !document.querySelector('.px-card-movement')) {
    loadedKey = '';
    context = null;
    removeReopenButton();
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
    if (!card) {
      context = null;
      removeReopenButton();
      return;
    }
    context = { month, card };
    loadedKey = key;
    decorate();
  } catch {
    removeReopenButton();
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function closeReopen() {
  document.querySelector('[data-card-statement-reopen]')?.remove();
  document.querySelector('[data-card-statement-reopen-backdrop]')?.remove();
}

function reopenRoot() {
  return document.querySelector<HTMLElement>('[data-card-statement-reopen]');
}

function reopenFeedback(text: string, warn = false) {
  const node = reopenRoot()?.querySelector<HTMLElement>('[data-statement-reopen-feedback]');
  if (!node) return;
  node.className = `px-notice ${warn ? 'warn' : 'ok'}`;
  node.textContent = text;
}

function reopenErrorMessage(message: string) {
  if (message.includes('STATEMENT_ALREADY_REOPENED')) return 'Esta fatura já foi reaberta. A tela será atualizada para refletir o estado confirmado pelo servidor.';
  if (message.includes('STATEMENT_PAYMENT_NOT_FOUND')) return 'Não foi encontrado um pagamento auditado desta fatura para estornar.';
  if (message.includes('CARD_INACTIVE')) return 'O cartão está inativo. Reative o cartão antes de reabrir a fatura.';
  if (message.includes('STATEMENT_PAYMENT_EVENT_MISSING')) return 'O lançamento monetário original do pagamento não está mais disponível. A reabertura foi bloqueada para preservar a integridade.';
  if (message.includes('STATEMENT_PAYMENT_EVENT_CHANGED')) return 'O lançamento monetário do pagamento foi alterado depois da baixa. A reabertura automática foi bloqueada.';
  if (message.includes('STATEMENT_PAYMENT_LEDGER_CHANGED')) return 'O razão do pagamento não corresponde mais ao registro original. Nenhuma alteração foi realizada.';
  if (message.includes('STATEMENT_REOPEN_CONFLICT')) return 'As parcelas atuais não correspondem mais ao pagamento original. Nenhuma alteração foi realizada.';
  if (message.includes('STATEMENT_CHANGED_RETRY')) return 'A fatura mudou enquanto a reabertura era confirmada. Atualize a tela e tente novamente.';
  if (message.includes('OPERATION_ID_REUSED')) return 'A tentativa anterior foi alterada durante o reenvio. Feche esta janela, revise a fatura e tente novamente.';
  if (message.includes('VALIDATION_ERROR')) return 'Informe um motivo com pelo menos 4 caracteres antes de confirmar a reabertura.';
  return message;
}

async function openReopen() {
  if (!canReopen()) return;
  await loadContext(true);
  const item = context;
  if (!item) return;
  const entries = paidEntries(item);
  const amount = paidAmount(item);
  if (!entries.length || amount <= 0) {
    setInlineStatus('Esta fatura não possui parcelas pagas para reabrir.', true);
    return;
  }

  closeReopen();
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'px-launch-backdrop';
  backdrop.dataset.cardStatementReopenBackdrop = 'true';
  backdrop.setAttribute('aria-label', 'Fechar reabertura da fatura');
  backdrop.addEventListener('click', closeReopen);

  const drawer = document.createElement('aside');
  drawer.className = 'px-launch-drawer px-card-statement-payment';
  drawer.dataset.cardStatementReopen = 'true';
  drawer.innerHTML = `<div class="px-drawer-head"><div><span class="px-kicker">Cartões / faturas</span><h2>Reabrir fatura paga</h2></div><button class="px-icon-btn" type="button" data-statement-reopen-close>×</button></div>
    <div class="px-statement-payment-body">
      <div class="px-statement-payment-summary">
        <div><span>Cartão</span><strong>${escapeHtml(item.card.name)}</strong></div>
        <div><span>Fatura</span><strong>${escapeHtml(item.month)}</strong></div>
        <div><span>Parcelas pagas</span><strong>${escapeHtml(entries.length)}</strong></div>
        <div class="emphasis"><span>Pagamento a estornar</span><strong>${escapeHtml(money(amount))}</strong></div>
      </div>
      <div class="px-notice warn"><strong>Ação protegida.</strong> A reabertura estorna a baixa monetária desta fatura: o lançamento original é arquivado, seu registro no razão é removido e as parcelas ligadas àquele pagamento voltam para aberto. Compras e histórico não são apagados.</div>
      <div class="px-notice ok">Depois da reabertura, uma compra só poderá ser editada ou cancelada se não restar nenhuma outra parcela paga ligada a ela.</div>
      <label class="px-field"><span>Motivo da reabertura *</span><textarea data-statement-reopen-reason maxlength="240" rows="4" placeholder="Ex.: pagamento lançado na conta incorreta"></textarea></label>
      <div class="px-notice" data-statement-reopen-feedback>Revise a fatura e informe o motivo. Nenhuma alteração será feita até a confirmação do servidor.</div>
      <div class="px-statement-payment-actions"><button class="px-secondary-action" type="button" data-statement-reopen-close>Cancelar</button><button class="px-primary-action" type="button" data-statement-reopen-save>Reabrir e estornar pagamento</button></div>
    </div>`;

  document.body.append(backdrop, drawer);
  drawer.querySelectorAll('[data-statement-reopen-close]').forEach((node) => node.addEventListener('click', closeReopen));
  drawer.querySelector('[data-statement-reopen-save]')?.addEventListener('click', () => void submitReopen(item));
  drawer.querySelector<HTMLTextAreaElement>('[data-statement-reopen-reason]')?.focus();
}

async function submitReopen(item: StatementContext) {
  const root = reopenRoot();
  if (!root) return;
  const reason = root.querySelector<HTMLTextAreaElement>('[data-statement-reopen-reason]')?.value.trim() || '';
  const button = root.querySelector<HTMLButtonElement>('[data-statement-reopen-save]');
  if (reason.length < 4) {
    reopenFeedback('Informe um motivo com pelo menos 4 caracteres.', true);
    return;
  }

  const key = `${item.card.id}|${item.month}|${reason}`;
  if (button) {
    button.disabled = true;
    button.textContent = 'Reabrindo…';
  }
  reopenFeedback('Validando pagamento, razão e parcelas antes de efetivar a reabertura…');

  try {
    const result = await cardsClient.reopenStatement(item.card.id, item.month, {
      reason,
      operationId: operationId(key),
    });
    const replay = Boolean(result.idempotentReplay);
    reopenOperation = null;
    closeReopen();
    setInlineStatus(replay
      ? `Reabertura já estava confirmada: ${money(Number(result.amount || 0))}. Nenhum estorno duplicado foi criado.`
      : `Fatura reaberta: ${money(Number(result.amount || 0))} e ${result.installments} parcela(s) retornaram para aberto. Atualizando caixa e fatura…`);
    loadedKey = '';
    context = null;
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', {
      detail: {
        path: `/cards/${item.card.id}/statements/${item.month}/reopen`,
        method: 'POST',
        domain: 'cards',
        source: 'statement-reopen',
      }
    }));
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Não foi possível reabrir a fatura.';
    if (raw.includes('STATEMENT_ALREADY_REOPENED')) {
      reopenOperation = null;
      closeReopen();
      setInlineStatus('A fatura já estava reaberta no servidor. Atualizando a fotografia atual…');
      loadedKey = '';
      context = null;
      window.dispatchEvent(new CustomEvent('meg:data-invalidated', {
        detail: {
          path: `/cards/${item.card.id}/statements/${item.month}/reopen`,
          method: 'POST',
          domain: 'cards',
          source: 'statement-reopen-reconcile',
        }
      }));
      return;
    }
    if (button) {
      button.disabled = false;
      button.textContent = 'Tentar reabrir novamente';
    }
    reopenFeedback(`${reopenErrorMessage(raw)} Os dados foram mantidos para uma nova tentativa.`, true);
  }
}

function scheduleSync() {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void loadContext(false);
    decorate();
  }, 55);
}

function onInvalidated(event: Event) {
  const detail = (event as CustomEvent<{ path?: string }>).detail || {};
  if (!String(detail.path || '').startsWith('/cards')) return;
  loadedKey = '';
  context = null;
  requestSerial += 1;
  window.setTimeout(() => void loadContext(true), 180);
}

function start() {
  window.addEventListener('meg:data-invalidated', onInvalidated as EventListener);
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardStatementReopenBridge() {
  observer?.disconnect();
  observer = null;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = null;
  window.removeEventListener('meg:data-invalidated', onInvalidated as EventListener);
  closeReopen();
  removeReopenButton();
}
