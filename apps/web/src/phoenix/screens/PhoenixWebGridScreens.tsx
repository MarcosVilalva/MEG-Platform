import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import type { PhoenixReadModel } from '../contracts';
import { receivablesClient } from '../../app/receivables-client';
import { readSession } from '../../app/auth-client';
import { loadPhoenixReadModel } from '../data/load-phoenix-read-model';
import { megConfirm } from '../meg-confirm';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function PageIntro({ kicker, title, text, aside }: { kicker: string; title: string; text: string; aside?: React.ReactNode }) {
  return <header className="px-screen-head"><div><span className="px-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{aside ? <div className="px-screen-head-aside">{aside}</div> : null}</header>;
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function parseBrazilianNumber(value: string) {
  const normalized = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function active(filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return Boolean(filter.value.trim());
  if (filter.kind === 'multi') return filter.values.length > 0;
  if (filter.kind === 'number') return Boolean(filter.min || filter.max);
  return Boolean(filter.from || filter.to);
}

function summary(label: string, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return `${label}: ${filter.value}`;
  if (filter.kind === 'multi') return `${label}: ${filter.values.length} valor(es)`;
  if (filter.kind === 'number') return `${label}: ${filter.min || '−∞'} até ${filter.max || '+∞'}`;
  return `${label}: ${filter.from || 'início'} até ${filter.to || 'fim'}`;
}

function matches(value: string | number, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return !filter.value.trim() || normalize(value).includes(normalize(filter.value));
  if (filter.kind === 'multi') return !filter.values.length || filter.values.includes(normalize(value));
  if (filter.kind === 'date') {
    const current = String(value).slice(0, 10);
    if (filter.from && current < filter.from) return false;
    if (filter.to && current > filter.to) return false;
    return true;
  }
  const current = typeof value === 'number' ? value : Number.NaN;
  const min = parseBrazilianNumber(filter.min);
  const max = parseBrazilianNumber(filter.max);
  if (min !== null && current < min) return false;
  if (max !== null && current > max) return false;
  return true;
}

function compare(left: string | number, right: string | number, direction: PhoenixGridSortDirection) {
  if (typeof left === 'number' && typeof right === 'number') return direction === 'asc' ? left - right : right - left;
  const result = String(left).localeCompare(String(right), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function options(values: Array<string | number>, label?: (value: string) => string): PhoenixGridOption[] {
  const map = new Map<string, { label: string; count: number }>();
  values.forEach((raw) => {
    const value = normalize(raw);
    const current = map.get(value);
    map.set(value, { label: label ? label(String(raw)) : String(raw), count: (current?.count || 0) + 1 });
  });
  return [...map.entries()].map(([value, item]) => ({ value, label: item.label, count: item.count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

function statusText(status: string) {
  return ({ open: 'Em aberto', partial: 'Parcial', paid: 'Recebido', overdue: 'Vencido', cancelled: 'Cancelado' } as Record<string, string>)[status] || status;
}

function isoDay(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

type ReceivableKey = 'dueDate' | 'description' | 'customer' | 'installment' | 'totalAmount' | 'openAmount' | 'status' | 'receipts';
type ReceivableRow = Record<ReceivableKey, string | number> & { id: string };
type ReceivableFilters = Record<ReceivableKey, PhoenixGridFilterValue>;

function initialReceivableFilters(): ReceivableFilters {
  return {
    dueDate: { kind: 'date', from: '', to: '' }, description: { kind: 'text', value: '' },
    customer: { kind: 'multi', values: [] }, installment: { kind: 'multi', values: [] },
    totalAmount: { kind: 'number', min: '', max: '' }, openAmount: { kind: 'number', min: '', max: '' },
    status: { kind: 'multi', values: [] }, receipts: { kind: 'number', min: '', max: '' }
  };
}

const receivableLabels: Record<ReceivableKey, string> = { dueDate: 'Vencimento', description: 'Descrição', customer: 'Cliente', installment: 'Parcela', totalAmount: 'Total', openAmount: 'Em aberto', status: 'Status', receipts: 'Recebimentos' };

export function PhoenixReceivablesGrid({ data, onDataCommitted }: { data: PhoenixReadModel; onDataCommitted?: (snapshot: PhoenixReadModel) => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ReceivableFilters>(initialReceivableFilters);
  const [sort, setSort] = useState<{ key: ReceivableKey; direction: PhoenixGridSortDirection } | null>(null);
  const [newTitleOpen, setNewTitleOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [receiptTargetId, setReceiptTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const operationRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const today = todaySaoPaulo();
  const role = readSession()?.user.role;
  const canWrite = role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
  const canCancel = role === 'ADMIN' || role === 'MANAGER';

  const [titleDraft, setTitleDraft] = useState({
    customerId: '',
    description: '',
    totalAmount: '',
    dueDate: today,
    notes: '',
  });
  const [receiptDraft, setReceiptDraft] = useState({
    amount: '',
    receivedAt: today,
    interestAmount: '0,00',
    fineAmount: '0,00',
    accountId: '',
    paymentMethodId: '',
    notes: '',
  });

  const open = data.receivables.filter((item) => item.status !== 'paid' && Number(item.openAmount) > 0);
  const overdue = open.filter((item) => isoDay(item.dueDate) < today);
  const totalOpen = open.reduce((sum, item) => sum + Number(item.openAmount || 0), 0);
  const totalReceived = data.receivables.reduce((sum, item) => sum + item.receipts.reduce((receiptSum, receipt) => receiptSum + Number(receipt.amount || 0) + Number(receipt.interestAmount || 0) + Number(receipt.fineAmount || 0), 0), 0);
  const rows = useMemo<ReceivableRow[]>(() => data.receivables.map((item) => ({
    id: item.id,
    dueDate: isoDay(item.dueDate),
    description: item.description,
    customer: item.customer?.name || 'Não informado',
    installment: item.installmentQty > 1 ? `${item.installmentNo}/${item.installmentQty}` : 'Única',
    totalAmount: Number(item.totalAmount || 0),
    openAmount: Number(item.openAmount || 0),
    status: statusText(item.status),
    receipts: item.receipts.length
  })), [data.receivables]);

  const keys = Object.keys(receivableLabels) as ReceivableKey[];
  const activeKeys = keys.filter((key) => active(filters[key]));
  const gridOptions = useMemo(() => ({
    customer: options(rows.map((row) => row.customer)),
    installment: options(rows.map((row) => row.installment)),
    status: options(rows.map((row) => row.status))
  }), [rows]);
  const visible = useMemo(() => {
    const needle = normalize(search);
    const filtered = rows.filter((row) => (!needle || normalize(keys.map((key) => row[key]).join(' ')).includes(needle)) && keys.every((key) => matches(row[key], filters[key])));
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => compare(a[sort.key], b[sort.key], sort.direction));
  }, [rows, search, filters, sort]);
  const activeCustomers = data.customers.filter((item) => item.isActive);
  const monetaryAccounts = data.accounts.filter((item) => item.isActive && ['checking', 'savings', 'cash'].includes(normalize(item.type)));
  const receiptMethods = data.paymentMethods.filter((item) => item.isActive && normalize(item.type) !== 'credit' && !normalize(item.name).includes('verocard'));
  const receiptTarget = receiptTargetId ? data.receivables.find((item) => item.id === receiptTargetId) || null : null;
  const editingTitle = editingTitleId ? data.receivables.find((item) => item.id === editingTitleId) || null : null;

  function operationId(prefix: string, fingerprint: string) {
    if (operationRef.current?.fingerprint === fingerprint) return operationRef.current.id;
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const id = `${prefix}:${random}`;
    operationRef.current = { fingerprint, id };
    return id;
  }

  function resetOperation() {
    operationRef.current = null;
  }

  function header(label: string, key: ReceivableKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSort({ key, direction })} onChange={(value) => setFilters((current) => ({ ...current, [key]: value }))} /></div>;
  }

  function clearAll() {
    setSearch('');
    setFilters(initialReceivableFilters());
    setSort(null);
  }

  function receivableError(error: unknown) {
    const code = error instanceof Error ? error.message : 'RECEIVABLE_WRITE_FAILED';
    if (/AMOUNT_EXCEEDS_OPEN_BALANCE/i.test(code)) return 'O valor informado ultrapassa o saldo em aberto deste título.';
    if (/RECEIVABLE_NOT_FOUND/i.test(code)) return 'Este título já foi quitado, alterado ou não está mais disponível.';
    if (/RECEIVABLE_STALE_VERSION/i.test(code)) return 'Este título mudou em outro dispositivo. A tela será atualizada antes de uma nova tentativa.';
    if (/RECEIVABLE_HAS_RECEIPTS/i.test(code)) return 'Este título já possui recebimento registrado e não pode mais ser editado ou cancelado.';
    if (/RECEIVABLE_NOT_EDITABLE/i.test(code)) return 'Este título já foi quitado ou cancelado e está protegido contra alteração.';
    if (/INVALID_ACCOUNT/i.test(code)) return 'A conta selecionada não está mais ativa.';
    if (/INVALID_PAYMENT_METHOD/i.test(code)) return 'A forma de recebimento selecionada não está mais ativa.';
    if (/FUTURE_RECEIPT_NOT_ALLOWED/i.test(code)) return 'O recebimento não pode ser confirmado em data futura.';
    if (/INVALID_CUSTOMER/i.test(code)) return 'O cliente selecionado não está mais ativo.';
    if (/OPERATION_ID_REUSED/i.test(code)) return 'A tentativa atual não corresponde à operação original. Revise os dados antes de tentar novamente.';
    if (/VALIDATION_ERROR/i.test(code)) return 'Revise os campos obrigatórios e os valores informados.';
    if (/403|FORBIDDEN/i.test(code)) return 'Seu perfil não possui permissão para esta operação.';
    return 'Não foi possível confirmar a operação no servidor. Os dados foram mantidos para nova tentativa.';
  }

  async function refreshOfficialSnapshot() {
    const snapshot = await loadPhoenixReadModel(data.month, { force: true });
    onDataCommitted?.(snapshot);
  }

  function closeTitleEditor() {
    if (busy) return;
    setNewTitleOpen(false);
    setEditingTitleId(null);
  }

  function openNewTitle() {
    resetOperation();
    setMessage('');
    setEditingTitleId(null);
    setTitleDraft({ customerId: '', description: '', totalAmount: '', dueDate: today, notes: '' });
    setNewTitleOpen(true);
  }

  function openEditTitle(id: string) {
    const target = data.receivables.find((item) => item.id === id);
    if (!target || target.receipts.length || ['paid', 'cancelled'].includes(target.status)) return;
    resetOperation();
    setMessage('');
    setEditingTitleId(id);
    setTitleDraft({
      customerId: target.customer?.id || '',
      description: target.description,
      totalAmount: Number(target.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      dueDate: isoDay(target.dueDate),
      notes: target.notes || '',
    });
    setNewTitleOpen(true);
  }

  function openReceipt(id: string) {
    const target = data.receivables.find((item) => item.id === id);
    if (!target) return;
    resetOperation();
    setMessage('');
    setReceiptDraft({
      amount: Number(target.openAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      receivedAt: today,
      interestAmount: '0,00',
      fineAmount: '0,00',
      accountId: '',
      paymentMethodId: '',
      notes: '',
    });
    setReceiptTargetId(id);
  }

  async function saveTitle() {
    if (busy || !canWrite) return;
    const amount = parseBrazilianNumber(titleDraft.totalAmount) || 0;
    if (titleDraft.description.trim().length < 2) return setMessage('Informe uma descrição para o título.');
    if (amount <= 0) return setMessage('Informe um valor maior que zero.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(titleDraft.dueDate)) return setMessage('Informe uma data de vencimento válida.');
    const fingerprint = JSON.stringify({ action: editingTitle ? 'update-receivable' : 'create-receivable', id: editingTitle?.id || '', ...titleDraft, amount });
    const opId = operationId(editingTitle ? 'web-receivable-edit' : 'web-receivable', fingerprint);
    setBusy(true);
    setMessage(editingTitle ? 'Atualizando título e conferindo a versão…' : 'Criando título e confirmando no servidor…');
    try {
      if (editingTitle) {
        await receivablesClient.updateReceivable(editingTitle.id, {
          customerId: titleDraft.customerId || null,
          description: titleDraft.description.trim().toLocaleUpperCase('pt-BR'),
          totalAmount: amount,
          dueDate: titleDraft.dueDate,
          notes: titleDraft.notes.trim() || null,
          expectedUpdatedAt: editingTitle.updatedAt,
          operationId: opId,
        });
      } else {
        await receivablesClient.createReceivable({
          customerId: titleDraft.customerId || null,
          description: titleDraft.description.trim().toLocaleUpperCase('pt-BR'),
          totalAmount: amount,
          dueDate: titleDraft.dueDate,
          installmentNo: 1,
          installmentQty: 1,
          interestRate: 0,
          fineRate: 0,
          notes: titleDraft.notes.trim() || null,
          operationId: opId,
        });
      }
      await refreshOfficialSnapshot();
      resetOperation();
      setNewTitleOpen(false);
      setEditingTitleId(null);
      setMessage(editingTitle ? 'Título atualizado e confirmado na base financeira.' : 'Título criado e confirmado na base financeira.');
    } catch (error) {
      setMessage(receivableError(error));
    } finally {
      setBusy(false);
    }
  }

  async function cancelTitle(id: string) {
    if (busy || !canCancel) return;
    const target = data.receivables.find((item) => item.id === id);
    if (!target || target.receipts.length || ['paid', 'cancelled'].includes(target.status)) return;
    const confirmed = await megConfirm({
      kicker: 'Contas a receber',
      title: 'Cancelar este título?',
      message: `${target.description} · ${money.format(Number(target.openAmount || 0))}. O título ficará preservado no histórico como cancelado e não poderá receber baixas.`,
      confirmLabel: 'Cancelar título',
      cancelLabel: 'Voltar',
      danger: true,
    });
    if (!confirmed) return;

    const fingerprint = JSON.stringify({ action:'cancel-receivable', id:target.id, updatedAt:target.updatedAt || '' });
    const opId = operationId('web-receivable-cancel', fingerprint);
    setBusy(true);
    setMessage('Cancelando título e preservando a auditoria…');
    try {
      await receivablesClient.cancelReceivable(target.id, {
        expectedUpdatedAt: target.updatedAt,
        operationId: opId,
      });
      await refreshOfficialSnapshot();
      resetOperation();
      setMessage('Título cancelado e preservado no histórico.');
    } catch (error) {
      setMessage(receivableError(error));
      if (/RECEIVABLE_STALE_VERSION/i.test(error instanceof Error ? error.message : '')) await refreshOfficialSnapshot();
    } finally {
      setBusy(false);
    }
  }

  async function receiveTitle() {
    if (!receiptTarget || busy || !canWrite) return;
    const amount = parseBrazilianNumber(receiptDraft.amount) || 0;
    const interest = parseBrazilianNumber(receiptDraft.interestAmount) || 0;
    const fine = parseBrazilianNumber(receiptDraft.fineAmount) || 0;
    const openAmount = Number(receiptTarget.openAmount || 0);
    if (amount <= 0) return setMessage('Informe o valor principal recebido.');
    if (amount > openAmount + 0.0001) return setMessage('O valor principal não pode ultrapassar o saldo em aberto.');
    if (!receiptDraft.accountId) return setMessage('Selecione a conta que recebeu o valor.');
    if (!receiptDraft.paymentMethodId) return setMessage('Selecione a forma de recebimento.');
    if (receiptDraft.receivedAt > today) return setMessage('A data de recebimento não pode ser futura.');
    const fingerprint = JSON.stringify({ action:'receive-receivable', id:receiptTarget.id, ...receiptDraft, amount, interest, fine });
    const opId = operationId('web-receipt', fingerprint);
    setBusy(true);
    setMessage('Confirmando recebimento e atualizando o caixa…');
    try {
      await receivablesClient.receive(receiptTarget.id, {
        amount,
        receivedAt: receiptDraft.receivedAt,
        interestAmount: interest,
        fineAmount: fine,
        accountId: receiptDraft.accountId,
        paymentMethodId: receiptDraft.paymentMethodId,
        notes: receiptDraft.notes.trim() || null,
        operationId: opId,
      });
      await refreshOfficialSnapshot();
      resetOperation();
      setReceiptTargetId(null);
      setMessage('Recebimento confirmado. O título e o saldo financeiro foram atualizados.');
    } catch (error) {
      setMessage(receivableError(error));
    } finally {
      setBusy(false);
    }
  }

  return <section className="px-screen meg-web-receivables-screen">
    <PageIntro
      kicker="Contas a receber"
      title="Títulos, clientes e recebimentos"
      text="Cadastre valores a receber, acompanhe vencimentos e confirme recebimentos diretamente no caixa. A baixa gera evento financeiro realizado e relê a base oficial antes de atualizar a tela."
      aside={<div className="meg-web-receivable-head-actions"><span className="px-total-pill">{money.format(totalOpen)} em aberto</span><button className="px-primary-action" type="button" disabled={!canWrite} onClick={openNewTitle}>＋ Novo título</button></div>}
    />

    <section className="px-screen-kpis">
      <article><span>Em aberto</span><strong>{money.format(totalOpen)}</strong><small>{open.length} título(s)</small></article>
      <article className="danger"><span>Vencidos</span><strong>{overdue.length}</strong><small>{money.format(overdue.reduce((sum, item) => sum + Number(item.openAmount || 0), 0))}</small></article>
      <article><span>Recebido</span><strong>{money.format(totalReceived)}</strong><small>Principal + acréscimos registrados</small></article>
      <article><span>Clientes ativos</span><strong>{activeCustomers.length}</strong><small>Gerenciados em Cadastros</small></article>
    </section>

    {message ? <div className={`meg-web-operation-feedback ${/não|ultrapassa|revise|permissão|futura|maior que zero/i.test(message) ? 'warn' : 'ok'}`}>{message}</div> : null}

    <section className="px-card px-table-card">
      <div className="px-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título, cliente, status ou parcela" /></label>
        <span className="px-toolbar-note">{visible.length} de {rows.length} exibido(s)</span>
      </div>
      {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da grade</span>{search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearch('')}>×</button></span> : null}{activeKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{summary(receivableLabels[key], filters[key])}<button type="button" onClick={() => { const fresh = initialReceivableFilters(); setFilters((current) => ({ ...current, [key]: fresh[key] })); }}>×</button></span>)}{sort ? <span className="px-grid-filter-chip">Ordenação: {receivableLabels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={() => setSort(null)}>×</button></span> : null}<button className="px-grid-clear-all" type="button" onClick={clearAll}>Limpar grade</button></div> : null}
      <div className="px-table-scroll">
        <table className="px-data-table">
          <thead><tr>
            <th>{header('Vencimento','dueDate','date')}</th><th>{header('Descrição','description','text')}</th><th>{header('Cliente','customer','multi',gridOptions.customer)}</th><th>{header('Parcela','installment','multi',gridOptions.installment)}</th><th>{header('Total','totalAmount','number')}</th><th>{header('Em aberto','openAmount','number')}</th><th>{header('Status','status','multi',gridOptions.status)}</th><th>{header('Recebimentos','receipts','number')}</th><th>Ações</th>
          </tr></thead>
          <tbody>{visible.map((row) => <tr key={row.id}>
            <td>{date.format(new Date(`${row.dueDate}T12:00:00Z`))}</td><td><strong>{row.description}</strong></td><td>{row.customer}</td><td>{row.installment}</td><td className="px-money">{money.format(Number(row.totalAmount))}</td><td className="px-money">{money.format(Number(row.openAmount))}</td><td><span className={`px-status ${normalize(row.status).replace(/\s+/g,'-')}`}>{row.status}</span></td><td>{row.receipts}</td><td><div className="meg-web-row-actions">{Number(row.openAmount) > 0 ? <button type="button" disabled={!canWrite} onClick={() => openReceipt(row.id)}>Receber</button> : <span className="px-status reconciled">Quitado</span>}</div></td>
          </tr>)}</tbody>
        </table>
        {!visible.length ? <p className="px-empty">Nenhum título corresponde aos filtros aplicados.</p> : null}
      </div>
    </section>

    {newTitleOpen && typeof document !== 'undefined' ? createPortal(<div className="meg-web-receivable-overlay">
      <button className="meg-web-receivable-backdrop" type="button" aria-label="Fechar novo título" disabled={busy} onClick={() => setNewTitleOpen(false)} />
      <section className="meg-web-receivable-dialog" role="dialog" aria-modal="true" aria-labelledby="meg-new-receivable-title">
        <header><div><span className="px-kicker">Contas a receber</span><h2 id="meg-new-receivable-title">Novo título</h2><p>Cadastre uma obrigação de recebimento sem alterar o caixa antes da baixa real.</p></div><button type="button" disabled={busy} onClick={() => setNewTitleOpen(false)}>×</button></header>
        <div className="meg-web-receivable-form">
          <label><span>Cliente</span><select value={titleDraft.customerId} onChange={(event) => setTitleDraft((current) => ({ ...current, customerId:event.target.value }))}><option value="">Sem cliente vinculado</option>{activeCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="wide"><span>Descrição *</span><input autoFocus maxLength={160} value={titleDraft.description} onChange={(event) => setTitleDraft((current) => ({ ...current, description:event.target.value }))} /></label>
          <label><span>Valor *</span><input inputMode="decimal" placeholder="0,00" value={titleDraft.totalAmount} onChange={(event) => setTitleDraft((current) => ({ ...current, totalAmount:event.target.value }))} /></label>
          <label><span>Vencimento *</span><input type="date" value={titleDraft.dueDate} onChange={(event) => setTitleDraft((current) => ({ ...current, dueDate:event.target.value }))} /></label>
          <label className="wide"><span>Observações</span><textarea maxLength={500} value={titleDraft.notes} onChange={(event) => setTitleDraft((current) => ({ ...current, notes:event.target.value }))} /></label>
          {message ? <div className="meg-web-form-feedback wide">{message}</div> : null}
        </div>
        <footer><button type="button" disabled={busy} onClick={() => setNewTitleOpen(false)}>Cancelar</button><button className="px-primary-action" type="button" disabled={busy || !canWrite} onClick={() => void createTitle()}>{busy ? 'Confirmando…' : 'Criar título'}</button></footer>
      </section>
    </div>, document.body) : null}

    {receiptTarget && typeof document !== 'undefined' ? createPortal(<div className="meg-web-receivable-overlay">
      <button className="meg-web-receivable-backdrop" type="button" aria-label="Fechar recebimento" disabled={busy} onClick={() => setReceiptTargetId(null)} />
      <section className="meg-web-receivable-dialog receipt" role="dialog" aria-modal="true" aria-labelledby="meg-receipt-title">
        <header><div><span className="px-kicker">Baixa de recebimento</span><h2 id="meg-receipt-title">{receiptTarget.description}</h2><p>{receiptTarget.customer?.name || 'Sem cliente vinculado'} · saldo em aberto {money.format(Number(receiptTarget.openAmount || 0))}</p></div><button type="button" disabled={busy} onClick={() => setReceiptTargetId(null)}>×</button></header>
        <div className="meg-web-receivable-summary">
          <span><small>Total do título</small><strong>{money.format(Number(receiptTarget.totalAmount || 0))}</strong></span>
          <span><small>Já recebido</small><strong>{money.format(Number(receiptTarget.totalAmount || 0) - Number(receiptTarget.openAmount || 0))}</strong></span>
          <span><small>Em aberto</small><strong>{money.format(Number(receiptTarget.openAmount || 0))}</strong></span>
        </div>
        <div className="meg-web-receivable-form">
          <label><span>Principal recebido *</span><input inputMode="decimal" value={receiptDraft.amount} onChange={(event) => setReceiptDraft((current) => ({ ...current, amount:event.target.value }))} /></label>
          <label><span>Data do recebimento *</span><input type="date" max={today} value={receiptDraft.receivedAt} onChange={(event) => setReceiptDraft((current) => ({ ...current, receivedAt:event.target.value }))} /></label>
          <label><span>Juros</span><input inputMode="decimal" value={receiptDraft.interestAmount} onChange={(event) => setReceiptDraft((current) => ({ ...current, interestAmount:event.target.value }))} /></label>
          <label><span>Multa</span><input inputMode="decimal" value={receiptDraft.fineAmount} onChange={(event) => setReceiptDraft((current) => ({ ...current, fineAmount:event.target.value }))} /></label>
          <label><span>Conta que recebeu *</span><select value={receiptDraft.accountId} onChange={(event) => setReceiptDraft((current) => ({ ...current, accountId:event.target.value }))}><option value="">Selecione</option>{monetaryAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Forma de recebimento *</span><select value={receiptDraft.paymentMethodId} onChange={(event) => setReceiptDraft((current) => ({ ...current, paymentMethodId:event.target.value }))}><option value="">Selecione</option>{receiptMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="wide"><span>Observações</span><textarea maxLength={500} value={receiptDraft.notes} onChange={(event) => setReceiptDraft((current) => ({ ...current, notes:event.target.value }))} /></label>
          {receiptTarget.receipts.length ? <div className="meg-web-receipt-history wide"><strong>Recebimentos anteriores</strong>{receiptTarget.receipts.slice(0,5).map((item) => <span key={item.id}><small>{date.format(new Date(String(item.receivedAt)))}</small><b>{money.format(Number(item.amount || 0) + Number(item.interestAmount || 0) + Number(item.fineAmount || 0))}</b></span>)}</div> : null}
          {message ? <div className="meg-web-form-feedback wide">{message}</div> : null}
        </div>
        <footer><button type="button" disabled={busy} onClick={() => setReceiptTargetId(null)}>Cancelar</button><button className="px-primary-action" type="button" disabled={busy || !canWrite} onClick={() => void receiveTitle()}>{busy ? 'Confirmando baixa…' : 'Confirmar recebimento'}</button></footer>
      </section>
    </div>, document.body) : null}
  </section>;
}

type RevenueKey = 'eventDate' | 'description' | 'scope' | 'category' | 'account' | 'payment' | 'status' | 'amount';
type RevenueRow = Record<RevenueKey, string | number> & { id: string; realized: boolean };
type RevenueFilters = Record<RevenueKey, PhoenixGridFilterValue>;
function initialRevenueFilters(): RevenueFilters { return { eventDate:{kind:'date',from:'',to:''}, description:{kind:'text',value:''}, scope:{kind:'multi',values:[]}, category:{kind:'multi',values:[]}, account:{kind:'multi',values:[]}, payment:{kind:'multi',values:[]}, status:{kind:'multi',values:[]}, amount:{kind:'number',min:'',max:''} }; }
const revenueLabels: Record<RevenueKey,string> = { eventDate:'Data', description:'Descrição', scope:'Escopo', category:'Classificação', account:'Conta', payment:'Forma', status:'Situação', amount:'Valor' };

function revenueBenefit(event: PhoenixReadModel['events']['items'][number]) {
  return normalize(event.account?.type) === 'benefit'
    || normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`).includes('verocard')
    || normalize(event.description).includes('verocard');
}

export function PhoenixRevenuesGrid({
  data,
  onCreateRevenue,
  onEditRevenue,
}: {
  data: PhoenixReadModel;
  onCreateRevenue?: () => void;
  onEditRevenue?: (eventId: string) => void;
}) {
  const [search,setSearch] = useState('');
  const [filters,setFilters] = useState<RevenueFilters>(initialRevenueFilters);
  const [sort,setSort] = useState<{key:RevenueKey;direction:PhoenixGridSortDirection}|null>(null);
  const revenues = useMemo(() => data.events.items.filter((event) => event.competence === data.month && event.type === 'income'), [data]);
  const rows = useMemo<RevenueRow[]>(() => revenues.map((event) => ({
    id:event.id, eventDate:event.date.slice(0,10), description:event.description,
    scope:revenueBenefit(event) ? 'Benefício alimentação' : 'Monetária',
    category:event.category?.group || event.category?.name || 'Sem classificação',
    account:event.account?.name || 'Não informada', payment:event.paymentMethod?.name || event.sourceDetails?.paymentMethod || 'Não informada',
    status:event.status, amount:Number(event.signedAmount || 0), realized:['confirmed','paid','reconciled'].includes(event.status)
  })), [revenues]);
  const keys = Object.keys(revenueLabels) as RevenueKey[];
  const activeKeys = keys.filter((key) => active(filters[key]));
  const gridOptions = useMemo(() => ({
    scope:options(rows.map((row)=>row.scope)), category:options(rows.map((row)=>row.category)), account:options(rows.map((row)=>row.account)),
    payment:options(rows.map((row)=>row.payment)), status:options(rows.map((row)=>row.status))
  }), [rows]);
  const visible = useMemo(() => {
    const needle=normalize(search);
    const filtered=rows.filter((row)=>(!needle || normalize(keys.map((key)=>row[key]).join(' ')).includes(needle)) && keys.every((key)=>matches(row[key],filters[key])));
    if(!sort)return filtered;
    return [...filtered].sort((a,b)=>compare(a[sort.key],b[sort.key],sort.direction));
  }, [rows,search,filters,sort]);
  const hasFilters = Boolean(search.trim()) || activeKeys.length > 0;
  const metricRows = hasFilters ? visible : rows;
  const monetaryRows = metricRows.filter((row) => row.scope === 'Monetária');
  const benefitRows = metricRows.filter((row) => row.scope === 'Benefício alimentação');
  const monetaryTotal = monetaryRows.reduce((sum,row)=>sum+Number(row.amount),0);
  const benefitTotal = benefitRows.reduce((sum,row)=>sum+Number(row.amount),0);
  const monetaryRealized = monetaryRows.filter((row)=>row.realized).reduce((sum,row)=>sum+Number(row.amount),0);
  const periodMonetary = rows.filter((row)=>row.scope==='Monetária').reduce((sum,row)=>sum+Number(row.amount),0);
  const periodBenefit = rows.filter((row)=>row.scope==='Benefício alimentação').reduce((sum,row)=>sum+Number(row.amount),0);
  function header(label:string,key:RevenueKey,kind:PhoenixGridFilterKind,list?:PhoenixGridOption[]){return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key===key?sort.direction:null} onSort={(direction)=>setSort({key,direction})} onChange={(value)=>setFilters((current)=>({...current,[key]:value}))}/></div>;}
  function clearAll(){setSearch('');setFilters(initialRevenueFilters());setSort(null);}
  return <section className="px-screen"><PageIntro
      kicker="Receitas"
      title="Origem e evolução das entradas"
      text="Receitas monetárias e créditos de benefício permanecem visíveis, porém separados conforme a política financeira do MEG."
      aside={onCreateRevenue ? <button className="px-primary-action" type="button" onClick={onCreateRevenue}>＋ Nova receita</button> : undefined}
    />
    <section className="px-screen-kpis">
      <article><span>Receitas monetárias</span><strong>{money.format(monetaryTotal)}</strong><small>{hasFilters ? `Visão filtrada · Total do período ${money.format(periodMonetary)}` : `${monetaryRows.length} entrada(s)`}</small></article>
      <article className="info"><span>Benefício alimentação</span><strong>{money.format(benefitTotal)}</strong><small>{hasFilters ? `Visão filtrada · Total do período ${money.format(periodBenefit)}` : 'Fora do caixa monetário'}</small></article>
      <article><span>Monetárias realizadas</span><strong>{money.format(monetaryRealized)}</strong><small>Confirmadas, pagas ou conciliadas</small></article>
      <article><span>Ticket médio monetário</span><strong>{money.format(monetaryRows.length ? monetaryTotal / monetaryRows.length : 0)}</strong><small>{hasFilters ? 'Calculado sobre a seleção filtrada' : 'Média das entradas monetárias'}</small></article>
    </section>
    <section className="px-card px-table-card"><div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar em todas as colunas"/></label><span className="px-toolbar-note">{visible.length} de {rows.length} exibido(s)</span></div>
      {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da grade</span>{search?<span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={()=>setSearch('')}>×</button></span>:null}{activeKeys.map((key)=><span className="px-grid-filter-chip" key={key}>{summary(revenueLabels[key],filters[key])}<button type="button" onClick={()=>{const fresh=initialRevenueFilters();setFilters((current)=>({...current,[key]:fresh[key]}));}}>×</button></span>)}{sort?<span className="px-grid-filter-chip">Ordenação: {revenueLabels[sort.key]} {sort.direction==='asc'?'↑':'↓'}<button type="button" onClick={()=>setSort(null)}>×</button></span>:null}<button className="px-grid-clear-all" type="button" onClick={clearAll}>Limpar grade</button></div>:null}
      <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Data','eventDate','date')}</th><th>{header('Descrição','description','text')}</th><th>{header('Escopo','scope','multi',gridOptions.scope)}</th><th>{header('Classificação','category','multi',gridOptions.category)}</th><th>{header('Conta','account','multi',gridOptions.account)}</th><th>{header('Forma','payment','multi',gridOptions.payment)}</th><th>{header('Situação','status','multi',gridOptions.status)}</th><th>{header('Valor','amount','number')}</th>{onEditRevenue ? <th aria-label="Ações" /> : null}</tr></thead><tbody>{visible.map((row)=><tr key={row.id} onDoubleClick={onEditRevenue ? () => onEditRevenue(row.id) : undefined} title={onEditRevenue ? 'Duplo clique para editar a receita' : undefined}><td>{date.format(new Date(`${row.eventDate}T12:00:00Z`))}</td><td><strong>{row.description}</strong></td><td><span className={`px-status ${row.scope === 'Monetária' ? 'reconciled' : 'planned'}`}>{row.scope}</span></td><td>{row.category}</td><td>{row.account}</td><td>{row.payment}</td><td><span className={`px-status ${row.status}`}>{row.status}</span></td><td className={`px-money ${Number(row.amount)<0?'negative':'positive'}`}>{money.format(Number(row.amount))}</td>{onEditRevenue ? <td><button className="px-detail-btn" type="button" aria-label={`Editar ${row.description}`} onClick={() => onEditRevenue(row.id)}>Editar</button></td> : null}</tr>)}</tbody></table>{!visible.length?<p className="px-empty">Nenhuma receita corresponde aos filtros aplicados.</p>:null}</div>
    </section></section>;
}

type CashflowKey = 'day' | 'income' | 'expense' | 'net' | 'realizedBalance' | 'projectedBalance' | 'eventCount';
type CashflowRow = Record<CashflowKey,string|number>;
type CashflowFilters = Record<CashflowKey,PhoenixGridFilterValue>;
function initialCashflowFilters():CashflowFilters{return{day:{kind:'date',from:'',to:''},income:{kind:'number',min:'',max:''},expense:{kind:'number',min:'',max:''},net:{kind:'number',min:'',max:''},realizedBalance:{kind:'number',min:'',max:''},projectedBalance:{kind:'number',min:'',max:''},eventCount:{kind:'number',min:'',max:''}};}
const cashflowLabels:Record<CashflowKey,string>={day:'Data',income:'Entradas',expense:'Saídas',net:'Líquido',realizedBalance:'Saldo realizado',projectedBalance:'Saldo projetado',eventCount:'Eventos'};

export function PhoenixCashflowGrid({data}:{data:PhoenixReadModel}){
  const cashflow=data.cashflow;
  const [filters,setFilters]=useState<CashflowFilters>(initialCashflowFilters);
  const [sort,setSort]=useState<{key:CashflowKey;direction:PhoenixGridSortDirection}|null>(null);
  const rows=useMemo<CashflowRow[]>(()=>cashflow.days.map((day)=>({day:day.date,income:day.income,expense:day.expense,net:day.net,realizedBalance:day.realizedBalance,projectedBalance:day.projectedBalance,eventCount:day.eventCount})),[cashflow.days]);
  const keys=Object.keys(cashflowLabels) as CashflowKey[];
  const activeKeys=keys.filter((key)=>active(filters[key]));
  const visible=useMemo(()=>{const filtered=rows.filter((row)=>keys.every((key)=>matches(row[key],filters[key])));if(!sort)return filtered;return[...filtered].sort((a,b)=>compare(a[sort.key],b[sort.key],sort.direction));},[rows,filters,sort]);
  function header(label:string,key:CashflowKey,kind:PhoenixGridFilterKind){return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} sort={sort?.key===key?sort.direction:null} onSort={(direction)=>setSort({key,direction})} onChange={(value)=>setFilters((current)=>({...current,[key]:value}))}/></div>;}
  return <section className="px-screen"><PageIntro kicker="Fluxo de caixa" title="Fechamento realizado e projetado" text="Saldos e movimentos diários fornecidos pelo serviço oficial de fluxo de caixa." />
    <section className="px-screen-kpis"><article><span>Saldo inicial</span><strong>{money.format(cashflow.openingBalance)}</strong><small>Antes do período</small></article><article><span>Entradas</span><strong>{money.format(cashflow.totalIncome)}</strong><small>Total do período</small></article><article className="danger"><span>Saídas</span><strong>{money.format(cashflow.totalExpense)}</strong><small>Total do período</small></article><article><span>Fechamento projetado</span><strong>{money.format(cashflow.projectedClosing)}</strong><small>Realizado: {money.format(cashflow.realizedClosing)}</small></article></section>
    <section className="px-card px-table-card"><div className="px-panel-head"><div><span>Movimentação diária</span><h2>Realizado x projetado</h2></div><strong>{visible.length} de {rows.length} dia(s)</strong></div>
      {activeKeys.length||sort?<div className="px-grid-active-filters"><span>Filtros da grade</span>{activeKeys.map((key)=><span className="px-grid-filter-chip" key={key}>{summary(cashflowLabels[key],filters[key])}<button type="button" onClick={()=>{const fresh=initialCashflowFilters();setFilters((current)=>({...current,[key]:fresh[key]}));}}>×</button></span>)}{sort?<span className="px-grid-filter-chip">Ordenação: {cashflowLabels[sort.key]} {sort.direction==='asc'?'↑':'↓'}<button type="button" onClick={()=>setSort(null)}>×</button></span>:null}<button className="px-grid-clear-all" type="button" onClick={()=>{setFilters(initialCashflowFilters());setSort(null);}}>Limpar grade</button></div>:null}
      <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Data','day','date')}</th><th>{header('Entradas','income','number')}</th><th>{header('Saídas','expense','number')}</th><th>{header('Líquido','net','number')}</th><th>{header('Saldo realizado','realizedBalance','number')}</th><th>{header('Saldo projetado','projectedBalance','number')}</th><th>{header('Eventos','eventCount','number')}</th></tr></thead><tbody>{visible.map((row)=><tr key={String(row.day)}><td>{date.format(new Date(`${row.day}T12:00:00Z`))}</td><td className="px-money positive">{money.format(Number(row.income))}</td><td className="px-money negative">{money.format(Number(row.expense))}</td><td className="px-money">{money.format(Number(row.net))}</td><td className="px-money">{money.format(Number(row.realizedBalance))}</td><td className="px-money">{money.format(Number(row.projectedBalance))}</td><td>{row.eventCount}</td></tr>)}</tbody></table>{!visible.length?<p className="px-empty">Nenhuma movimentação corresponde aos filtros aplicados.</p>:null}</div>
    </section></section>;
}
