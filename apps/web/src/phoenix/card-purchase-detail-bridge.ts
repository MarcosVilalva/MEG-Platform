import { cardsClient, type CardInstallment, type CardPurchase, type CreditCard } from '../app/cards-client';
import './phoenix-card-purchase-detail.css';

type RowSnapshot = {
  description: string;
  purchaseDate: string;
  installment: string;
  group: string;
  amount: number;
  status: string;
  statementMonth: string;
};

type PurchaseResolution = {
  card: CreditCard | null;
  purchase: CardPurchase | null;
  entry: CardInstallment | null;
  ambiguous: boolean;
};

const monthNumbers: Record<string, string> = {
  jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
  abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
  ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
  dez: '12', dezembro: '12'
};

let observer: MutationObserver | null = null;
let scheduled = false;
let requestSerial = 0;

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

function parseMoney(value: unknown) {
  const cleaned = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function brToIso(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function isoToBr(value: string) {
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
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

function activeTab() {
  return normalize(document.querySelector<HTMLElement>('.px-card-movement .px-tabbar button.active')?.textContent || '');
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

function formatMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value || '—';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function installmentParts(value: string) {
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  return { number: Number(match?.[1] || 1), count: Number(match?.[2] || 1) };
}

function readRow(row: HTMLTableRowElement): RowSnapshot | null {
  const cells = [...row.cells].map((cell) => cell.textContent?.trim() || '');
  const tab = activeTab();
  if (tab.includes('fatura atual')) {
    if (cells.length < 6) return null;
    return {
      description: cells[0],
      purchaseDate: brToIso(cells[1]),
      installment: cells[2],
      group: cells[3] || '—',
      amount: parseMoney(cells[4]),
      status: cells[5],
      statementMonth: activeMonth()
    };
  }
  if (tab.includes('parcelas futuras')) {
    if (cells.length < 5) return null;
    return {
      description: cells[0],
      purchaseDate: '',
      installment: cells[1],
      group: '—',
      amount: parseMoney(cells[3]),
      status: cells[4],
      statementMonth: monthFromText(cells[2])
    };
  }
  return null;
}

function entryMatches(entry: CardInstallment, snapshot: RowSnapshot, installmentNumber: number) {
  return Number(entry.number || 1) === installmentNumber
    && entry.statementMonth === snapshot.statementMonth
    && Math.round(Math.abs(Number(entry.amount || 0)) * 100) === Math.round(Math.abs(snapshot.amount) * 100);
}

async function resolvePurchase(snapshot: RowSnapshot): Promise<PurchaseResolution> {
  if (!/^\d{4}-\d{2}$/.test(snapshot.statementMonth)) return { card: null, purchase: null, entry: null, ambiguous: false };
  const cards = await cardsClient.list(snapshot.statementMonth);
  const card = cards.find((candidate) => normalize(candidate.name) === normalize(selectedCardName())) || null;
  if (!card) return { card: null, purchase: null, entry: null, ambiguous: false };

  const installment = installmentParts(snapshot.installment);
  const matches: Array<{ purchase: CardPurchase; entry: CardInstallment }> = [];
  for (const purchase of card.purchases) {
    if (purchase.id.startsWith('legacy-') || normalize(purchase.status) === 'cancelled') continue;
    if (normalize(purchase.description) !== normalize(snapshot.description)) continue;
    if (installment.count > 1 && Number(purchase.installments || 1) !== installment.count) continue;
    if (snapshot.purchaseDate && String(purchase.purchaseDate).slice(0, 10) !== snapshot.purchaseDate) continue;
    const entry = purchase.entries.find((candidate) => entryMatches(candidate, snapshot, installment.number));
    if (entry) matches.push({ purchase, entry });
  }

  if (matches.length !== 1) {
    return { card, purchase: null, entry: null, ambiguous: matches.length > 1 };
  }
  return { card, purchase: matches[0].purchase, entry: matches[0].entry, ambiguous: false };
}

function closeDetail() {
  document.querySelector('[data-card-screen-detail-drawer]')?.remove();
  document.querySelector('[data-card-screen-detail-backdrop]')?.remove();
}

function detailField(label: string, value: string) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>`;
}

function openDetail(snapshot: RowSnapshot, resolution: PurchaseResolution) {
  closeDetail();
  const card = resolution.card;
  const purchase = resolution.purchase;
  const entry = resolution.entry;
  const official = Boolean(card && purchase && entry);
  const installment = installmentParts(snapshot.installment);
  const purchaseDate = purchase ? String(purchase.purchaseDate).slice(0, 10) : snapshot.purchaseDate;
  const group = purchase?.category?.name || snapshot.group || '—';
  const dueDate = card ? statementDueIso(card, snapshot.statementMonth) : '';
  const status = normalize(entry?.status || snapshot.status) === 'paid' || normalize(snapshot.status).includes('pago') ? 'Pago' : 'Pendente';
  const description = `${purchase?.description || snapshot.description}${installment.count > 1 ? ` · ${installment.number}/${installment.count}` : ''}`;

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'px-card-purchase-detail-backdrop';
  backdrop.dataset.cardScreenDetailBackdrop = 'true';
  backdrop.setAttribute('aria-label', 'Fechar detalhes da compra');
  backdrop.addEventListener('click', closeDetail);

  const drawer = document.createElement('aside');
  drawer.className = 'px-detail-drawer px-card-purchase-detail open';
  drawer.dataset.cardScreenDetailDrawer = 'true';
  drawer.innerHTML = `<div class="px-drawer-head"><div><span class="px-kicker">Cartões / faturas</span><h2>Detalhes da compra</h2></div><button class="px-icon-btn" type="button" data-card-screen-detail-close>×</button></div>
    <div class="px-card-purchase-detail-body">
      <div class="px-detail-description">${escapeHtml(description)}</div>
      <div class="px-detail-grid">
        ${detailField('Vencimento', dueDate ? isoToBr(dueDate) : '—')}
        ${detailField('Data da compra', purchaseDate ? isoToBr(purchaseDate) : '—')}
        ${detailField('Situação', status)}
        ${detailField('Conta', card?.name || selectedCardName() || '—')}
        ${detailField('Tipo', 'Despesa no cartão')}
        ${detailField('Valor', formatMoney(Math.abs(Number(entry?.amount ?? snapshot.amount))))}
        ${detailField('Classificação', group)}
        ${detailField('Grupo', group)}
        ${detailField('Forma', `${card?.name || selectedCardName() || 'Cartão'} · Fatura ${snapshot.statementMonth.slice(5, 7)}/${snapshot.statementMonth.slice(0, 4)}`)}
        ${detailField('Modalidade', 'CRÉDITO')}
      </div>
      ${official ? `<div class="px-card-purchase-overview"><div><span>Valor total da compra</span><strong>${escapeHtml(formatMoney(Math.abs(Number(purchase!.totalAmount || 0))))}</strong></div><div><span>Parcelamento</span><strong>${escapeHtml(`${purchase!.installments} parcela(s)`)}</strong></div><div><span>Fatura desta parcela</span><strong>${escapeHtml(formatMonth(snapshot.statementMonth))}</strong></div></div><div class="px-notice ok">DOMÍNIO DE CARTÕES/FATURAS. Esta compra pode ser editada ou cancelada por aqui sem gerar movimentação monetária duplicada.</div>` : `<div class="px-notice warn">${resolution.ambiguous ? 'Mais de uma compra do domínio corresponde a esta parcela. A alteração foi bloqueada por segurança.' : 'Este lançamento está em compatibilidade legada ou não possui uma compra única no domínio de cartões. Ele permanece somente em leitura nesta tela.'}</div>`}
      <div class="px-detail-actions">${official ? '' : '<button class="px-secondary-action" type="button" disabled>Somente leitura</button>'}</div>
    </div>`;
  document.body.append(backdrop, drawer);
  drawer.querySelector('[data-card-screen-detail-close]')?.addEventListener('click', closeDetail);
}

async function openFromRow(row: HTMLTableRowElement) {
  const snapshot = readRow(row);
  if (!snapshot) return;
  const serial = ++requestSerial;
  row.classList.add('is-opening-card-detail');
  try {
    const resolution = await resolvePurchase(snapshot);
    if (serial !== requestSerial) return;
    openDetail(snapshot, resolution);
  } catch {
    if (serial !== requestSerial) return;
    openDetail(snapshot, { card: null, purchase: null, entry: null, ambiguous: false });
  } finally {
    row.classList.remove('is-opening-card-detail');
  }
}

function decorateRows() {
  scheduled = false;
  const panel = document.querySelector<HTMLElement>('.px-card-movement');
  if (!panel) return;
  const table = panel.querySelector<HTMLTableElement>('.px-data-table');
  if (!table) return;
  const tab = activeTab();

  if (tab.includes('fatura atual')) {
    table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
      row.dataset.cardRowClickable = 'true';
      const button = row.querySelector<HTMLButtonElement>('.px-detail-btn');
      if (button) {
        button.dataset.cardScreenDetail = 'true';
        button.title = 'Abrir detalhes da compra';
      }
    });
    return;
  }

  if (tab.includes('parcelas futuras')) {
    const headRow = table.querySelector<HTMLTableRowElement>('thead tr');
    if (headRow && !headRow.querySelector('[data-card-detail-column]')) {
      const th = document.createElement('th');
      th.dataset.cardDetailColumn = 'true';
      th.textContent = 'Detalhes';
      headRow.append(th);
    }
    table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
      row.dataset.cardRowClickable = 'true';
      if (row.querySelector('[data-card-detail-cell]')) return;
      const td = document.createElement('td');
      td.dataset.cardDetailCell = 'true';
      td.innerHTML = '<button class="px-detail-btn" data-card-screen-detail="true" type="button" title="Abrir detalhes da compra">↘</button>';
      row.append(td);
    });
  }
}

function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(decorateRows, 0);
}

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const row = target?.closest<HTMLTableRowElement>('.px-card-movement .px-data-table tbody tr[data-card-row-clickable="true"]');
  if (!row) return;
  const interactive = target?.closest('button,input,select,a,label');
  if (interactive && !interactive.closest('[data-card-screen-detail]')) return;
  event.preventDefault();
  void openFromRow(row);
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && document.querySelector('[data-card-screen-detail-drawer]')) closeDetail();
}

function start() {
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeyDown);
  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleDecorate();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardPurchaseDetailBridge() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', handleClick);
  document.removeEventListener('keydown', handleKeyDown);
  closeDetail();
}
