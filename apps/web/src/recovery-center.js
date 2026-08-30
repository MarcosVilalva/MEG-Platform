import { appendRecoveryActivities } from './activity-log-core.js';
import { buildSelectiveRecovery, inspectRecoveryState, isRecoveryFinancialState } from './recovery-center-core.js';

const DB_NAME = 'meg-financas-recovery';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const BASELINE_ID = 'cloud-baseline';
const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const ACCESS_KEY = 'meg-access-token';
const MAX_RESTORE_ATTEMPTS = 3;

let cachedSnapshots = [];
let selectedSnapshotId = '';
let selectedTransactionIds = new Set();
let filterText = '';
let restoreRunning = false;

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function parseJson(value) {
  try {
    return JSON.parse(value || 'null');
  } catch {
    return null;
  }
}

function currentState() {
  const appState = window.MEG_APP?.getStateRef?.() || window.MEG_APP?.getState?.();
  if (isRecoveryFinancialState(appState)) return appState;
  return parseJson(localStorage.getItem(STATE_KEY));
}

function transactionAmount(item) {
  if (item?.type === 'income') return Number(item.incomeAmount ?? item.amount ?? 0) || 0;
  return Number(item?.expenseAmount ?? item?.amount ?? 0) || 0;
}

function formatDate(value) {
  const text = String(value || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text || 'Data não informada';
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function reasonLabel(reason) {
  const labels = {
    'antes-de-alteracao-local': 'Antes de uma alteração local',
    'confirmado-na-nuvem': 'Após confirmação na nuvem',
    'nuvem-antes-da-abertura': 'Base da nuvem antes da abertura',
    'recuperacao-automatica-concluida': 'Após recuperação automática',
    'fechamento-do-aplicativo': 'Fechamento do aplicativo',
    'copia-manual': 'Cópia criada manualmente',
    'antes-de-recuperacao-seletiva': 'Proteção antes de uma recuperação seletiva',
  };
  if (labels[reason]) return labels[reason];
  if (String(reason || '').startsWith('copia-local-protegida-')) return 'Cópia local protegida após divergência';
  return String(reason || 'Cópia de segurança').replaceAll('-', ' ');
}

function openRecoveryDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readAllSnapshots() {
  const database = await openRecoveryDatabase();
  if (!database) return [];
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || [])
      .filter((item) => item?.id !== BASELINE_ID && isRecoveryFinancialState(item?.state))
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || ''))));
    request.onerror = () => resolve([]);
  });
}

async function readSnapshot(snapshotId) {
  const database = await openRecoveryDatabase();
  if (!database || !snapshotId) return null;
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(snapshotId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

export async function listRecoverySnapshots() {
  const state = currentState();
  const snapshots = await readAllSnapshots();
  return snapshots.map((snapshot) => ({
    ...snapshot,
    inspection: inspectRecoveryState(snapshot.state, state),
  }));
}

export async function inspectRecoverySnapshot(snapshotId) {
  const snapshot = await readSnapshot(snapshotId);
  if (!snapshot || !isRecoveryFinancialState(snapshot.state)) return null;
  return {
    snapshot,
    inspection: inspectRecoveryState(snapshot.state, currentState()),
  };
}

function authenticatedHeaders() {
  const token = sessionStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Sua sessão do MEG não está ativa. Entre novamente antes de recuperar lançamentos.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function cloudUrl(path) {
  const apiUrl = String(window.MEG_CLOUD?.apiUrl || '').replace(/\/$/, '');
  if (!apiUrl) throw new Error('A conexão com a nuvem ainda não está pronta. Aguarde a sincronização e tente novamente.');
  return `${apiUrl}${path}`;
}

async function cloudRequest(path, options = {}) {
  const response = await fetch(cloudUrl(path), {
    ...options,
    headers: {
      ...authenticatedHeaders(),
      ...(options.headers || {}),
    },
  });
  return response;
}

async function readLatestCloudState() {
  const response = await cloudRequest('/app-state', { method: 'GET' });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente no MEG antes de usar a recuperação.');
  if (!response.ok || !isRecoveryFinancialState(payload?.state)) {
    throw new Error('Não foi possível confirmar a base atual da nuvem. Nenhum lançamento foi alterado.');
  }
  return { state: payload.state, revision: Number(payload.revision || 0) };
}

function recoverySource(snapshot) {
  return {
    snapshotId: snapshot.id,
    snapshotCreatedAt: snapshot.createdAt,
    snapshotReason: snapshot.reason,
  };
}

async function createSafetySnapshot() {
  const protection = window.MEG_DATA_PROTECTION;
  if (!protection?.snapshot) return false;
  return Boolean(await protection.snapshot('antes-de-recuperacao-seletiva'));
}

export async function restoreSelectedTransactions(snapshotId, selectedIds) {
  const snapshot = await readSnapshot(snapshotId);
  if (!snapshot || !isRecoveryFinancialState(snapshot.state)) {
    throw new Error('A cópia selecionada não está mais disponível neste aparelho.');
  }

  const ids = [...new Set((selectedIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return { restoredCount: 0, restored: [], skippedExisting: [], conflicts: [] };

  await createSafetySnapshot();
  let latest = await readLatestCloudState();
  let lastSkipped = [];
  let lastConflicts = [];

  for (let attempt = 0; attempt < MAX_RESTORE_ATTEMPTS; attempt += 1) {
    const recovery = buildSelectiveRecovery(latest.state, snapshot.state, ids);
    const inspection = inspectRecoveryState(snapshot.state, latest.state);
    const selectedSet = new Set(ids);
    lastSkipped = recovery.skippedExisting;
    lastConflicts = inspection.conflicts.filter((item) => selectedSet.has(item.id));

    if (!recovery.restoredCount) {
      return {
        restoredCount: 0,
        restored: [],
        skippedExisting: lastSkipped,
        conflicts: lastConflicts,
        revision: latest.revision,
      };
    }

    const actor = window.MEG_CLOUD?.user || {};
    const stateWithRecoveredTransactions = {
      ...latest.state,
      transactions: [...latest.state.transactions, ...recovery.restored],
    };
    const stateWithHistory = appendRecoveryActivities(
      stateWithRecoveredTransactions,
      recovery.restored,
      actor,
      new Date(),
      recoverySource(snapshot),
    );

    const response = await cloudRequest('/app-state/transactions', {
      method: 'PATCH',
      body: JSON.stringify({
        expectedRevision: latest.revision,
        upserts: recovery.restored,
        deletes: [],
        activityLog: stateWithHistory.activityLog || [],
      }),
    });

    if (response.status === 409) {
      latest = await readLatestCloudState();
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sua sessão expirou durante a recuperação. Nenhum lançamento desta tentativa foi restaurado.');
    if (!response.ok) {
      const detail = payload?.error || payload?.message || `HTTP ${response.status}`;
      throw new Error(`A nuvem não confirmou a recuperação (${detail}). A base atual foi preservada.`);
    }

    const revision = Number(payload.revision || latest.revision);
    localStorage.setItem(REVISION_KEY, String(revision));
    return {
      restoredCount: recovery.restoredCount,
      restored: recovery.restored,
      skippedExisting: lastSkipped,
      conflicts: lastConflicts,
      revision,
    };
  }

  throw new Error('A base foi alterada simultaneamente em outros dispositivos. Nenhum lançamento existente foi sobrescrito. Tente novamente.');
}

function selectedSnapshot() {
  return cachedSnapshots.find((item) => item.id === selectedSnapshotId) || null;
}

function recoverySearchIndex(item) {
  const amount = transactionAmount(item);
  return [
    item?.description,
    item?.paymentMethod,
    item?.account,
    item?.group,
    item?.category,
    item?.date,
    String(amount),
    money.format(amount),
  ].map((value) => String(value || '').toLocaleUpperCase('pt-BR')).join(' ');
}

function visibleRecoverableItems(snapshot) {
  if (!snapshot) return [];
  const current = currentState();
  const inspection = inspectRecoveryState(snapshot.state, current);
  const search = filterText.trim().toLocaleUpperCase('pt-BR');
  return search
    ? inspection.recoverable.filter((item) => recoverySearchIndex(item).includes(search))
    : inspection.recoverable;
}

function setStatus(message, tone = '') {
  const status = document.querySelector('#megRecoveryStatus');
  if (!status) return;
  status.textContent = message || '';
  status.className = `meg-recovery-status ${tone}`.trim();
}

function updateSummary() {
  const copyMetric = document.querySelector('#megRecoveryCopiesMetric');
  const itemMetric = document.querySelector('#megRecoveryItemsMetric');
  const unique = new Set();
  cachedSnapshots.forEach((snapshot) => snapshot.inspection.recoverable.forEach((item) => unique.add(String(item.id))));
  if (copyMetric) copyMetric.textContent = String(cachedSnapshots.length);
  if (itemMetric) itemMetric.textContent = String(unique.size);
}

function snapshotCard(snapshot) {
  const inspection = snapshot.inspection;
  const active = snapshot.id === selectedSnapshotId;
  const badge = inspection.recoverableCount
    ? `<span class="meg-recovery-badge ready">${inspection.recoverableCount} recuperável${inspection.recoverableCount === 1 ? '' : 'is'}</span>`
    : '<span class="meg-recovery-badge">Sem ausentes</span>';
  return `
    <button class="meg-recovery-snapshot ${active ? 'active' : ''}" type="button" data-recovery-snapshot="${escapeHtml(snapshot.id)}">
      <span class="meg-recovery-snapshot-main"><strong>${escapeHtml(formatDateTime(snapshot.createdAt))}</strong><small>${escapeHtml(reasonLabel(snapshot.reason))}</small></span>
      <span class="meg-recovery-snapshot-meta">${badge}<small>Rev. ${Number(snapshot.revision || 0)} · ${Number(snapshot.transactionCount ?? snapshot.state?.transactions?.length ?? 0)} lançamentos${inspection.conflictCount ? ` · ${inspection.conflictCount} conflito(s)` : ''}</small></span>
    </button>`;
}

function transactionRow(item) {
  const id = String(item.id);
  const checked = selectedTransactionIds.has(id);
  const type = item.type === 'income' ? 'Receita' : 'Despesa';
  return `
    <label class="meg-recovery-transaction ${item.type === 'income' ? 'income' : 'expense'}">
      <input type="checkbox" data-recovery-transaction="${escapeHtml(id)}" ${checked ? 'checked' : ''} />
      <span class="meg-recovery-transaction-copy"><strong>${escapeHtml(item.description || 'Lançamento')}</strong><small>${escapeHtml(formatDate(item.date))} · ${escapeHtml(type)}${item.paymentMethod || item.account ? ` · ${escapeHtml(item.paymentMethod || item.account)}` : ''}${item.group || item.category ? ` · ${escapeHtml(item.group || item.category)}` : ''}</small></span>
      <b>${escapeHtml(money.format(transactionAmount(item)))}</b>
    </label>`;
}

function conflictRow(conflict) {
  const snapshotItem = conflict.snapshot || {};
  const currentItem = conflict.current || {};
  return `
    <article class="meg-recovery-conflict">
      <div><strong>${escapeHtml(snapshotItem.description || 'Lançamento')}</strong><small>${escapeHtml(formatDate(snapshotItem.date))} · ${escapeHtml(money.format(transactionAmount(snapshotItem)))}</small></div>
      <p>Já existe na base atual com o mesmo identificador e conteúdo diferente. O MEG não vai sobrescrever esse lançamento.</p>
      <small>Atual: ${escapeHtml(currentItem.description || 'Lançamento')} · ${escapeHtml(money.format(transactionAmount(currentItem)))}</small>
    </article>`;
}

function renderSnapshotList() {
  const container = document.querySelector('#megRecoverySnapshotList');
  if (!container) return;
  container.innerHTML = cachedSnapshots.length
    ? cachedSnapshots.map(snapshotCard).join('')
    : '<div class="meg-recovery-empty"><strong>Nenhuma cópia local disponível.</strong><span>As cópias de recuperação são armazenadas neste aparelho conforme o MEG é utilizado.</span></div>';
}

function renderSnapshotDetail() {
  const snapshot = selectedSnapshot();
  const detail = document.querySelector('#megRecoveryDetail');
  const title = document.querySelector('#megRecoveryDetailTitle');
  const subtitle = document.querySelector('#megRecoveryDetailSubtitle');
  const restoreButton = document.querySelector('#megRecoveryRestoreBtn');
  const selectAllButton = document.querySelector('#megRecoverySelectAllBtn');
  if (!detail || !title || !subtitle || !restoreButton || !selectAllButton) return;

  if (!snapshot) {
    title.textContent = 'Selecione uma cópia';
    subtitle.textContent = 'O MEG compara a cópia com a base atual sem alterar nada.';
    detail.innerHTML = '<div class="meg-recovery-empty"><span>Escolha uma cópia à esquerda para visualizar os lançamentos que existem nela e estão ausentes da base atual.</span></div>';
    restoreButton.disabled = true;
    selectAllButton.disabled = true;
    return;
  }

  const inspection = inspectRecoveryState(snapshot.state, currentState());
  const visibleItems = visibleRecoverableItems(snapshot);
  title.textContent = formatDateTime(snapshot.createdAt);
  subtitle.textContent = `${reasonLabel(snapshot.reason)} · ${inspection.recoverableCount} recuperável(is) · ${inspection.conflictCount} conflito(s)`;

  const recoverableMarkup = visibleItems.length
    ? `<div class="meg-recovery-section-title"><strong>Lançamentos ausentes</strong><span>Somente estes podem ser restaurados.</span></div>${visibleItems.map(transactionRow).join('')}`
    : `<div class="meg-recovery-empty"><span>${filterText ? 'Nenhum lançamento recuperável corresponde à busca.' : 'Esta cópia não possui lançamentos ausentes da base atual.'}</span></div>`;
  const conflictMarkup = inspection.conflicts.length
    ? `<div class="meg-recovery-section-title conflict"><strong>Conflitos protegidos</strong><span>${inspection.conflictCount} item(ns) não serão sobrescritos.</span></div>${inspection.conflicts.map(conflictRow).join('')}`
    : '';
  detail.innerHTML = recoverableMarkup + conflictMarkup;

  const selectedAvailable = inspection.recoverable.filter((item) => selectedTransactionIds.has(String(item.id))).length;
  restoreButton.disabled = restoreRunning || selectedAvailable === 0;
  restoreButton.textContent = selectedAvailable ? `Restaurar selecionados (${selectedAvailable})` : 'Restaurar selecionados';
  selectAllButton.disabled = visibleItems.length === 0;
  selectAllButton.textContent = visibleItems.length && visibleItems.every((item) => selectedTransactionIds.has(String(item.id)))
    ? 'Desmarcar exibidos'
    : 'Selecionar exibidos';
}

function renderAll() {
  updateSummary();
  renderSnapshotList();
  renderSnapshotDetail();
}

async function refreshSnapshots({ preserveSelection = true } = {}) {
  const previous = preserveSelection ? selectedSnapshotId : '';
  cachedSnapshots = await listRecoverySnapshots();
  selectedSnapshotId = cachedSnapshots.some((item) => item.id === previous)
    ? previous
    : cachedSnapshots.find((item) => item.inspection.recoverableCount > 0)?.id || cachedSnapshots[0]?.id || '';
  selectedTransactionIds = new Set();
  renderAll();
}

async function openDialog() {
  const dialog = document.querySelector('#megRecoveryDialog');
  if (!dialog) return;
  filterText = '';
  const search = document.querySelector('#megRecoverySearch');
  if (search) search.value = '';
  setStatus('Lendo as cópias protegidas deste aparelho...');
  if (!dialog.open) dialog.showModal();
  await refreshSnapshots({ preserveSelection: false });
  setStatus(cachedSnapshots.length ? 'Nenhuma alteração foi feita. Selecione apenas o que deseja recuperar.' : 'Ainda não há cópias locais para analisar.');
}

function toggleVisibleSelection() {
  const snapshot = selectedSnapshot();
  const visible = visibleRecoverableItems(snapshot);
  if (!visible.length) return;
  const allSelected = visible.every((item) => selectedTransactionIds.has(String(item.id)));
  visible.forEach((item) => {
    const id = String(item.id);
    if (allSelected) selectedTransactionIds.delete(id);
    else selectedTransactionIds.add(id);
  });
  renderSnapshotDetail();
}

async function runRestore() {
  if (restoreRunning || !selectedSnapshotId) return;
  const selected = [...selectedTransactionIds];
  if (!selected.length) return;
  const snapshot = selectedSnapshot();
  const inspection = snapshot ? inspectRecoveryState(snapshot.state, currentState()) : null;
  const valid = inspection?.recoverable.filter((item) => selectedTransactionIds.has(String(item.id))) || [];
  if (!valid.length) {
    setStatus('Os itens selecionados já não estão ausentes da base atual. Atualize a análise.', 'warning');
    await refreshSnapshots();
    return;
  }
  const total = valid.reduce((sum, item) => sum + Math.abs(transactionAmount(item)), 0);
  const confirmed = window.confirm(`Restaurar ${valid.length} lançamento(s) selecionado(s), total de ${money.format(total)}?\n\nA base atual não será substituída. O MEG adicionará somente lançamentos que continuarem ausentes na nuvem.`);
  if (!confirmed) return;

  restoreRunning = true;
  renderSnapshotDetail();
  setStatus('Criando proteção da base atual e confirmando a versão mais recente da nuvem...', 'loading');
  try {
    const result = await restoreSelectedTransactions(selectedSnapshotId, selected);
    if (!result.restoredCount) {
      const protectedCount = result.conflicts?.length || 0;
      setStatus(protectedCount
        ? `${protectedCount} item(ns) já existem com conteúdo diferente e foram protegidos. Nada foi sobrescrito.`
        : 'Os lançamentos selecionados já existem na base atual. Nenhuma duplicidade foi criada.', 'warning');
      await refreshSnapshots();
      return;
    }
    setStatus(`${result.restoredCount} lançamento(s) restaurado(s) e confirmado(s) na nuvem. Atualizando a base local...`, 'success');
    window.MEG_APP?.showToast?.(
      'Recuperação concluída',
      `${result.restoredCount} lançamento(s) ausente(s) foram restaurados sem substituir a base atual.`,
      'success',
    );
    window.setTimeout(() => location.reload(), 850);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Não foi possível concluir a recuperação. A base atual foi preservada.', 'error');
  } finally {
    restoreRunning = false;
    renderSnapshotDetail();
  }
}

function styles() {
  return `
    .meg-recovery-settings{margin-top:24px;padding:20px;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:var(--panel);box-shadow:0 12px 34px rgba(2,6,23,.12)}
    .meg-recovery-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.meg-recovery-settings h3,.meg-recovery-settings p{margin:0}.meg-recovery-settings p{margin-top:6px;color:var(--muted)}
    .meg-recovery-settings-actions{display:flex;gap:10px;flex-wrap:wrap}.meg-recovery-metrics{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:12px;margin-top:18px}.meg-recovery-metric{padding:14px;border-radius:14px;background:rgba(148,163,184,.09);border:1px solid rgba(148,163,184,.16)}.meg-recovery-metric span{display:block;color:var(--muted);font-size:.76rem}.meg-recovery-metric strong{display:block;margin-top:3px;font-size:1.35rem}
    #megRecoveryDialog{width:min(1120px,calc(100vw - 28px));max-width:none;padding:0;border:1px solid rgba(148,163,184,.22);border-radius:22px;background:var(--panel);color:inherit;box-shadow:0 28px 90px rgba(0,0,0,.45)}#megRecoveryDialog::backdrop{background:rgba(2,6,23,.72);backdrop-filter:blur(4px)}
    .meg-recovery-dialog-head{display:flex;justify-content:space-between;gap:20px;padding:20px 22px;border-bottom:1px solid rgba(148,163,184,.18)}.meg-recovery-dialog-head h2{margin:0}.meg-recovery-dialog-head p{margin:5px 0 0;color:var(--muted);font-size:.86rem}.meg-recovery-close{width:40px;height:40px;border-radius:12px;border:1px solid rgba(148,163,184,.22);background:transparent;color:inherit;font-size:1.45rem;cursor:pointer}
    .meg-recovery-safety{margin:16px 22px 0;padding:13px 15px;border-radius:14px;border:1px solid rgba(56,189,248,.28);background:rgba(14,165,233,.08);font-size:.84rem}.meg-recovery-safety strong{display:block;margin-bottom:3px}
    .meg-recovery-toolbar{display:flex;gap:10px;align-items:center;padding:14px 22px}.meg-recovery-toolbar input{min-width:0;flex:1}.meg-recovery-status{font-size:.78rem;color:var(--muted)}.meg-recovery-status.success{color:var(--success)}.meg-recovery-status.warning{color:#f59e0b}.meg-recovery-status.error{color:var(--danger)}
    .meg-recovery-grid{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);min-height:470px;border-top:1px solid rgba(148,163,184,.14)}.meg-recovery-snapshots{border-right:1px solid rgba(148,163,184,.14);overflow:auto;max-height:65vh}.meg-recovery-snapshot{width:100%;display:flex;flex-direction:column;gap:9px;padding:15px 17px;text-align:left;background:transparent;color:inherit;border:0;border-bottom:1px solid rgba(148,163,184,.12);cursor:pointer}.meg-recovery-snapshot:hover,.meg-recovery-snapshot.active{background:rgba(148,163,184,.08)}.meg-recovery-snapshot.active{box-shadow:inset 3px 0 0 var(--accent,#38bdf8)}.meg-recovery-snapshot-main,.meg-recovery-snapshot-meta{display:flex;flex-direction:column;gap:3px}.meg-recovery-snapshot small{color:var(--muted);font-size:.75rem}.meg-recovery-badge{align-self:flex-start;padding:3px 8px;border-radius:999px;background:rgba(148,163,184,.11);font-size:.68rem;font-weight:800}.meg-recovery-badge.ready{background:rgba(16,185,129,.14);color:var(--success)}
    .meg-recovery-detail-shell{display:flex;flex-direction:column;min-width:0;max-height:65vh}.meg-recovery-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:16px 18px;border-bottom:1px solid rgba(148,163,184,.12)}.meg-recovery-detail-head h3{margin:0}.meg-recovery-detail-head p{margin:4px 0 0;color:var(--muted);font-size:.78rem}.meg-recovery-detail-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.meg-recovery-detail{overflow:auto;padding-bottom:16px}.meg-recovery-section-title{display:flex;justify-content:space-between;gap:12px;padding:14px 18px 8px;color:var(--muted);font-size:.76rem}.meg-recovery-section-title strong{color:inherit;text-transform:uppercase;letter-spacing:.04em}.meg-recovery-section-title.conflict{margin-top:8px;color:#f59e0b}
    .meg-recovery-transaction{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;margin:6px 18px;padding:13px 14px;border:1px solid rgba(148,163,184,.15);border-radius:14px;background:rgba(148,163,184,.045);cursor:pointer}.meg-recovery-transaction:hover{border-color:rgba(56,189,248,.38)}.meg-recovery-transaction input{width:18px;height:18px}.meg-recovery-transaction-copy{min-width:0}.meg-recovery-transaction-copy strong,.meg-recovery-transaction-copy small{display:block}.meg-recovery-transaction-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.meg-recovery-transaction-copy small{margin-top:4px;color:var(--muted);font-size:.75rem}.meg-recovery-transaction>b{white-space:nowrap}.meg-recovery-transaction.income>b{color:var(--success)}.meg-recovery-transaction.expense>b{color:var(--danger)}
    .meg-recovery-conflict{margin:6px 18px;padding:13px 14px;border-radius:14px;border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.06)}.meg-recovery-conflict strong,.meg-recovery-conflict small{display:block}.meg-recovery-conflict p{margin:7px 0;color:inherit;font-size:.78rem}.meg-recovery-conflict small{color:var(--muted);font-size:.73rem}.meg-recovery-empty{display:grid;gap:5px;padding:28px 18px;color:var(--muted);text-align:center}.meg-recovery-empty strong{color:inherit}
    @media(max-width:760px){.meg-recovery-settings-head{display:grid}.meg-recovery-settings-actions{width:100%}.meg-recovery-settings-actions .button{flex:1}.meg-recovery-metrics{grid-template-columns:1fr 1fr}.meg-recovery-dialog-head{padding:16px}.meg-recovery-safety{margin:12px 16px 0}.meg-recovery-toolbar{padding:12px 16px;display:grid}.meg-recovery-grid{grid-template-columns:1fr;min-height:0}.meg-recovery-snapshots{border-right:0;border-bottom:1px solid rgba(148,163,184,.14);max-height:210px}.meg-recovery-detail-shell{max-height:55vh}.meg-recovery-detail-head{display:grid;padding:14px 16px}.meg-recovery-detail-actions{justify-content:stretch}.meg-recovery-detail-actions .button{flex:1}.meg-recovery-transaction{margin:6px 12px;grid-template-columns:auto minmax(0,1fr)}.meg-recovery-transaction>b{grid-column:2}.meg-recovery-conflict{margin:6px 12px}}
  `;
}

function ensureRecoveryCenter() {
  if (!document.getElementById('megRecoveryStyles')) {
    const style = document.createElement('style');
    style.id = 'megRecoveryStyles';
    style.textContent = styles();
    document.head.appendChild(style);
  }

  const settings = document.querySelector('#settings');
  if (settings && !document.querySelector('#megRecoverySettings')) {
    const panel = document.createElement('section');
    panel.id = 'megRecoverySettings';
    panel.className = 'meg-recovery-settings';
    panel.innerHTML = `
      <div class="meg-recovery-settings-head">
        <div><h3>Proteção e recuperação</h3><p>Revise cópias protegidas deste aparelho e recupere somente lançamentos ausentes, sem restaurar uma base antiga por completo.</p></div>
        <div class="meg-recovery-settings-actions"><button class="button primary" id="megOpenRecoveryBtn" type="button">Abrir central de recuperação</button><button class="button ghost" id="megCreateRecoverySnapshotBtn" type="button">Criar cópia agora</button></div>
      </div>
      <div class="meg-recovery-metrics"><div class="meg-recovery-metric"><span>Cópias locais disponíveis</span><strong id="megRecoveryCopiesMetric">0</strong></div><div class="meg-recovery-metric"><span>Lançamentos ausentes identificados</span><strong id="megRecoveryItemsMetric">0</strong></div></div>`;
    settings.appendChild(panel);
  }

  if (!document.querySelector('#megRecoveryDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'megRecoveryDialog';
    dialog.innerHTML = `
      <div class="meg-recovery-dialog-head"><div><h2>Central de recuperação</h2><p>Compare as cópias deste aparelho com a base atual e escolha exatamente o que deve voltar.</p></div><button class="meg-recovery-close" id="megRecoveryCloseBtn" type="button" aria-label="Fechar">×</button></div>
      <div class="meg-recovery-safety"><strong>Recuperação seletiva e segura</strong>A base atual continua sendo a referência. Lançamentos que já existem nunca são substituídos, e uma nova cópia de segurança é criada antes de qualquer restauração.</div>
      <div class="meg-recovery-toolbar"><input id="megRecoverySearch" type="search" placeholder="Buscar descrição, PIX, valor ou data" aria-label="Buscar lançamento nas cópias" /><button class="button ghost" id="megRecoveryRefreshBtn" type="button">Atualizar análise</button><span class="meg-recovery-status" id="megRecoveryStatus"></span></div>
      <div class="meg-recovery-grid"><div class="meg-recovery-snapshots" id="megRecoverySnapshotList"></div><div class="meg-recovery-detail-shell"><div class="meg-recovery-detail-head"><div><h3 id="megRecoveryDetailTitle">Selecione uma cópia</h3><p id="megRecoveryDetailSubtitle">O MEG compara a cópia com a base atual sem alterar nada.</p></div><div class="meg-recovery-detail-actions"><button class="button ghost" id="megRecoverySelectAllBtn" type="button" disabled>Selecionar exibidos</button><button class="button primary" id="megRecoveryRestoreBtn" type="button" disabled>Restaurar selecionados</button></div></div><div class="meg-recovery-detail" id="megRecoveryDetail"></div></div></div>`;
    document.body.appendChild(dialog);
  }

  document.querySelector('#megOpenRecoveryBtn')?.addEventListener('click', openDialog);
  document.querySelector('#megRecoveryCloseBtn')?.addEventListener('click', () => document.querySelector('#megRecoveryDialog')?.close());
  document.querySelector('#megRecoveryRefreshBtn')?.addEventListener('click', async () => {
    setStatus('Atualizando a comparação com a base atual...');
    await refreshSnapshots();
    setStatus('Análise atualizada. Nenhuma alteração foi feita.');
  });
  document.querySelector('#megCreateRecoverySnapshotBtn')?.addEventListener('click', async () => {
    const saved = await window.MEG_DATA_PROTECTION?.snapshot?.('copia-manual');
    window.MEG_APP?.showToast?.(saved ? 'Cópia criada' : 'Cópia não criada', saved ? 'A base atual foi protegida neste aparelho.' : 'O armazenamento local de recuperação não está disponível.', saved ? 'success' : 'danger');
    if (saved) await refreshSnapshots();
  });
  document.querySelector('#megRecoverySearch')?.addEventListener('input', (event) => {
    filterText = event.target.value || '';
    renderSnapshotDetail();
  });
  document.querySelector('#megRecoverySelectAllBtn')?.addEventListener('click', toggleVisibleSelection);
  document.querySelector('#megRecoveryRestoreBtn')?.addEventListener('click', runRestore);
  document.querySelector('#megRecoverySnapshotList')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-recovery-snapshot]');
    if (!button) return;
    selectedSnapshotId = button.dataset.recoverySnapshot || '';
    selectedTransactionIds = new Set();
    renderAll();
  });
  document.querySelector('#megRecoveryDetail')?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-recovery-transaction]');
    if (!checkbox) return;
    const id = checkbox.dataset.recoveryTransaction || '';
    if (checkbox.checked) selectedTransactionIds.add(id);
    else selectedTransactionIds.delete(id);
    renderSnapshotDetail();
  });

  listRecoverySnapshots().then((items) => {
    cachedSnapshots = items;
    updateSummary();
  }).catch(() => undefined);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureRecoveryCenter, { once: true });
  else ensureRecoveryCenter();
}

if (typeof window !== 'undefined') {
  window.MEG_RECOVERY_CENTER = {
    listSnapshots: listRecoverySnapshots,
    inspectSnapshot: inspectRecoverySnapshot,
    restoreSelected: restoreSelectedTransactions,
    open: openDialog,
  };
}
