import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { financeClient, type Account, type Category, type PaymentMethod } from '../../app/finance-client';
import { readSession } from '../../app/auth-client';
import type { CreditCard } from '../../app/cards-client';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import { resolvePhoenixCardIdentity } from '../card-identity';
import type { PhoenixReadModel } from '../contracts';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type CatalogTab = 'accounts' | 'categories' | 'payments' | 'cards';
type CatalogGridKey = 'name' | 'type' | 'institution' | 'openingBalance' | 'group' | 'status' | 'issuer' | 'brand' | 'creditLimit' | 'closingDay' | 'dueDay';
type CatalogSort = { key: CatalogGridKey; direction: PhoenixGridSortDirection } | null;
type CatalogFilterMap = Record<CatalogGridKey, PhoenixGridFilterValue>;
type CatalogRow = {
  id: string;
  name: string;
  type: string;
  institution: string;
  openingBalance: number | null;
  group: string;
  status: string;
  issuer: string;
  brand: string;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  updatedAt?: string;
  card?: CreditCard;
};

type CatalogState<T> = Record<CatalogTab, T>;
type EditableCatalogTab = Exclude<CatalogTab, 'cards'>;
type CatalogDraft = {
  name: string;
  type: string;
  institution: string;
  openingBalance: string;
  group: string;
};
type CatalogEditor = { mode: 'create' | 'edit'; tab: EditableCatalogTab; id?: string; expectedUpdatedAt?: string; draft: CatalogDraft } | null;

const emptyDraft = (): CatalogDraft => ({ name: '', type: '', institution: '', openingBalance: '0,00', group: '' });

const accountTypes = [
  ['checking', 'Conta corrente'], ['savings', 'Poupança'], ['cash', 'Dinheiro'],
  ['investment', 'Investimento'], ['credit', 'Crédito'], ['benefit', 'Benefício']
] as const;
const categoryTypes = [['expense', 'Despesa'], ['income', 'Receita']] as const;
const paymentTypes = [
  ['instant', 'Instantâneo / Pix'], ['bill', 'Boleto'], ['credit', 'Crédito'], ['debit', 'Débito'],
  ['transfer', 'Transferência'], ['cash', 'Dinheiro'], ['other', 'Outro']
] as const;

const tabKeys: Record<CatalogTab, CatalogGridKey[]> = {
  accounts: ['name', 'type', 'institution', 'openingBalance', 'status'],
  categories: ['name', 'group', 'type', 'status'],
  payments: ['name', 'type', 'status'],
  cards: ['name', 'issuer', 'brand', 'creditLimit', 'closingDay', 'dueDay']
};

const labels: Record<CatalogGridKey, string> = {
  name: 'Nome',
  type: 'Tipo',
  institution: 'Instituição',
  openingBalance: 'Saldo inicial',
  group: 'Grupo',
  status: 'Status',
  issuer: 'Emissor',
  brand: 'Bandeira',
  creditLimit: 'Limite',
  closingDay: 'Fechamento',
  dueDay: 'Vencimento'
};

function initialFilters(): CatalogFilterMap {
  return {
    name: { kind: 'text', value: '' },
    type: { kind: 'multi', values: [] },
    institution: { kind: 'multi', values: [] },
    openingBalance: { kind: 'number', min: '', max: '' },
    group: { kind: 'multi', values: [] },
    status: { kind: 'multi', values: [] },
    issuer: { kind: 'multi', values: [] },
    brand: { kind: 'multi', values: [] },
    creditLimit: { kind: 'number', min: '', max: '' },
    closingDay: { kind: 'number', min: '', max: '' },
    dueDay: { kind: 'number', min: '', max: '' }
  };
}

function initialFiltersByTab(): CatalogState<CatalogFilterMap> {
  return {
    accounts: initialFilters(),
    categories: initialFilters(),
    payments: initialFilters(),
    cards: initialFilters()
  };
}

function initialSortByTab(): CatalogState<CatalogSort> {
  return { accounts: null, categories: null, payments: null, cards: null };
}

function initialSearchByTab(): CatalogState<string> {
  return { accounts: '', categories: '', payments: '', cards: '' };
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function parseBrazilianNumber(value: string) {
  const normalized = String(value || '')
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function filterActive(filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return Boolean(filter.value.trim());
  if (filter.kind === 'multi') return filter.values.length > 0;
  if (filter.kind === 'number') return Boolean(filter.min || filter.max);
  return Boolean(filter.from || filter.to);
}

function filterSummary(label: string, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return `${label}: ${filter.value}`;
  if (filter.kind === 'multi') return `${label}: ${filter.values.length} valor(es)`;
  if (filter.kind === 'number') return `${label}: ${filter.min || '−∞'} até ${filter.max || '+∞'}`;
  return `${label}: ${filter.from || 'início'} até ${filter.to || 'fim'}`;
}

function matches(value: string | number | null, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return !filter.value.trim() || normalize(value).includes(normalize(filter.value));
  if (filter.kind === 'multi') return !filter.values.length || filter.values.includes(normalize(value));
  if (filter.kind === 'number') {
    const current = typeof value === 'number' ? value : Number.NaN;
    if (!Number.isFinite(current)) return !filter.min && !filter.max;
    const min = parseBrazilianNumber(filter.min);
    const max = parseBrazilianNumber(filter.max);
    if (min !== null && current < min) return false;
    if (max !== null && current > max) return false;
    return true;
  }
  return true;
}

function compare(left: string | number | null, right: string | number | null, direction: PhoenixGridSortDirection) {
  const emptyLeft = left === null || left === '';
  const emptyRight = right === null || right === '';
  if (emptyLeft !== emptyRight) return emptyLeft ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') return direction === 'asc' ? left - right : right - left;
  const result = String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function optionList(rows: CatalogRow[], key: CatalogGridKey): PhoenixGridOption[] {
  const values = new Map<string, { label: string; count: number }>();
  rows.forEach((row) => {
    const label = String(row[key] ?? '—');
    const value = normalize(label);
    const current = values.get(value);
    values.set(value, { label, count: (current?.count || 0) + 1 });
  });
  return [...values.entries()]
    .map(([value, item]) => ({ value, label: item.label, count: item.count }))
    .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

function PageIntro() {
  return <header className="px-screen-head">
    <div><span className="px-kicker">Cadastros</span><h1>Base operacional</h1><p>Contas, classificações, grupos, formas de pagamento e cartões usados pelas regras financeiras.</p></div>
    <div className="px-screen-head-aside"><span className="px-status reconciled">Histórico protegido</span></div>
  </header>;
}

export function PhoenixCatalogsGrid({ data, onDataCommitted }: { data: PhoenixReadModel; onDataCommitted?: (snapshot: PhoenixReadModel) => void }) {
  const [tab, setTab] = useState<CatalogTab>('accounts');
  const [filtersByTab, setFiltersByTab] = useState<CatalogState<CatalogFilterMap>>(initialFiltersByTab);
  const [sortByTab, setSortByTab] = useState<CatalogState<CatalogSort>>(initialSortByTab);
  const [searchByTab, setSearchByTab] = useState<CatalogState<string>>(initialSearchByTab);
  const [accounts, setAccounts] = useState<Account[]>(() => data.accounts.map((item) => ({ ...item })));
  const [categories, setCategories] = useState<Category[]>(() => data.categories.map((item) => ({ ...item })));
  const [payments, setPayments] = useState<PaymentMethod[]>(() => data.paymentMethods.map((item) => ({ ...item })));
  const [editor, setEditor] = useState<CatalogEditor>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationMessage, setMutationMessage] = useState('');
  const [activeConfirm, setActiveConfirm] = useState<{ row: CatalogRow; active: boolean } | null>(null);
  const mutationOperationRef = useRef<{ fingerprint: string; operationId: string } | null>(null);
  const role = readSession()?.user.role;
  const canWrite = role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
  const canDeactivate = role === 'ADMIN' || role === 'MANAGER';

  function mutationOperationId(fingerprint: string) {
    if (mutationOperationRef.current?.fingerprint === fingerprint) return mutationOperationRef.current.operationId;
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const operationId = `catalog:${random}`;
    mutationOperationRef.current = { fingerprint, operationId };
    return operationId;
  }

  function clearMutationOperation() {
    mutationOperationRef.current = null;
  }

  useEffect(() => { setAccounts(data.accounts.map((item) => ({ ...item }))); }, [data.accounts]);
  useEffect(() => { setCategories(data.categories.map((item) => ({ ...item }))); }, [data.categories]);
  useEffect(() => { setPayments(data.paymentMethods.map((item) => ({ ...item }))); }, [data.paymentMethods]);

  const activeAccounts = accounts.filter((item) => item.isActive);
  const activeCategories = categories.filter((item) => item.isActive);
  const activePayments = payments.filter((item) => item.isActive);

  const rows = useMemo<CatalogRow[]>(() => {
    if (tab === 'accounts') return accounts.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || '—',
      institution: item.institution || '—',
      openingBalance: Number(item.openingBalance || 0),
      group: '',
      status: item.isActive ? 'Ativa' : 'Inativa',
      issuer: '', brand: '', creditLimit: null, closingDay: null, dueDay: null,
      updatedAt: item.updatedAt
    }));
    if (tab === 'categories') return categories.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || '—',
      institution: '', openingBalance: null,
      group: item.group || '—',
      status: item.isActive ? 'Ativa' : 'Inativa',
      issuer: '', brand: '', creditLimit: null, closingDay: null, dueDay: null,
      updatedAt: item.updatedAt
    }));
    if (tab === 'payments') return payments.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || '—',
      institution: '', openingBalance: null, group: '',
      status: item.isActive ? 'Ativa' : 'Inativa',
      issuer: '', brand: '', creditLimit: null, closingDay: null, dueDay: null,
      updatedAt: item.updatedAt
    }));
    return data.cards.map((item) => ({
      id: item.id,
      name: item.name,
      type: '', institution: '', openingBalance: null, group: '', status: '',
      issuer: item.issuer || '—',
      brand: item.brand || '—',
      creditLimit: Number(item.creditLimit || 0),
      closingDay: Number(item.closingDay || 0),
      dueDay: Number(item.dueDay || 0),
      card: item
    }));
  }, [accounts, categories, payments, data.cards, tab]);

  const filters = filtersByTab[tab];
  const sort = sortByTab[tab];
  const search = searchByTab[tab];
  const keys = tabKeys[tab];
  const activeFilterKeys = keys.filter((key) => filterActive(filters[key]));

  const options = useMemo(() => ({
    type: optionList(rows, 'type'),
    institution: optionList(rows, 'institution'),
    group: optionList(rows, 'group'),
    status: optionList(rows, 'status'),
    issuer: optionList(rows, 'issuer'),
    brand: optionList(rows, 'brand')
  }), [rows]);

  const visibleRows = useMemo(() => {
    const needle = normalize(search);
    const filtered = rows.filter((row) => {
      const searchable = normalize(keys.map((key) => row[key]).join(' '));
      if (needle && !searchable.includes(needle)) return false;
      return keys.every((key) => matches(row[key] as string | number | null, filters[key]));
    });
    if (!sort || !keys.includes(sort.key)) return filtered;
    return [...filtered].sort((left, right) => compare(left[sort.key] as string | number | null, right[sort.key] as string | number | null, sort.direction));
  }, [rows, keys, filters, search, sort]);

  function updateFilter(key: CatalogGridKey, value: PhoenixGridFilterValue) {
    setFiltersByTab((current) => ({ ...current, [tab]: { ...current[tab], [key]: value } }));
  }

  function clearFilter(key: CatalogGridKey) {
    const fresh = initialFilters();
    setFiltersByTab((current) => ({ ...current, [tab]: { ...current[tab], [key]: fresh[key] } }));
  }

  function clearGrid() {
    setFiltersByTab((current) => ({ ...current, [tab]: initialFilters() }));
    setSortByTab((current) => ({ ...current, [tab]: null }));
    setSearchByTab((current) => ({ ...current, [tab]: '' }));
  }

  function setSearch(value: string) {
    setSearchByTab((current) => ({ ...current, [tab]: value }));
  }

  function setSort(key: CatalogGridKey, direction: PhoenixGridSortDirection) {
    setSortByTab((current) => ({ ...current, [tab]: { key, direction } }));
  }

  function clearSort() {
    setSortByTab((current) => ({ ...current, [tab]: null }));
  }

  function header(label: string, key: CatalogGridKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSort(key, direction)} onChange={(value) => updateFilter(key, value)} /></div>;
  }

  function draftForRow(row: CatalogRow): CatalogDraft {
    return {
      name: row.name === '—' ? '' : row.name,
      type: row.type === '—' ? '' : row.type,
      institution: row.institution === '—' ? '' : row.institution,
      openingBalance: Number(row.openingBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      group: row.group === '—' ? '' : row.group
    };
  }

  function openNew() {
    setMutationMessage('');
    clearMutationOperation();
    if (tab === 'cards') {
      window.dispatchEvent(new CustomEvent('meg:open-card-management'));
      return;
    }
    if (!canWrite) return;
    const draft = emptyDraft();
    if (tab === 'accounts') draft.type = 'checking';
    if (tab === 'categories') draft.type = 'expense';
    if (tab === 'payments') draft.type = 'instant';
    setEditor({ mode: 'create', tab, draft });
  }

  function openEdit(row: CatalogRow) {
    setMutationMessage('');
    clearMutationOperation();
    if (tab === 'cards') {
      window.dispatchEvent(new CustomEvent('meg:open-card-management'));
      return;
    }
    if (!canWrite) return;
    setEditor({ mode: 'edit', tab, id: row.id, expectedUpdatedAt: row.updatedAt, draft: draftForRow(row) });
  }

  function updateDraft(key: keyof CatalogDraft, value: string) {
    setEditor((current) => current ? { ...current, draft: { ...current.draft, [key]: value } } : current);
  }

  function commitCatalogSnapshot(nextAccounts: Account[], nextCategories: Category[], nextPayments: PaymentMethod[]) {
    onDataCommitted?.({
      ...data,
      accounts: nextAccounts.map((item) => ({ ...item })),
      categories: nextCategories.map((item) => ({ ...item })),
      paymentMethods: nextPayments.map((item) => ({ ...item })),
    });
  }

  function replaceCatalogItem<T extends { id: string }>(items: T[], saved: T, create: boolean) {
    return create ? [...items, saved] : items.map((item) => item.id === saved.id ? saved : item);
  }

  function mutationError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar o cadastro.';
    if (/ACCOUNT_ALREADY_EXISTS/i.test(message)) return 'Já existe uma conta com este nome. Edite ou reative o cadastro existente.';
    if (/CATEGORY_ALREADY_EXISTS/i.test(message)) return 'Já existe esta combinação de classificação, grupo e tipo. Edite ou reative o cadastro existente.';
    if (/PAYMENT_METHOD_ALREADY_EXISTS/i.test(message)) return 'Já existe uma forma de pagamento com este nome. Edite ou reative o cadastro existente.';
    if (/CATALOG_STALE_VERSION/i.test(message)) return 'Este cadastro foi alterado em outro dispositivo. Feche a edição, aguarde a sincronização e abra novamente antes de salvar.';
    if (/OPERATION_ID_REUSED/i.test(message)) return 'Os dados mudaram depois de uma tentativa anterior. Revise o cadastro e tente salvar novamente.';
    if (/VALIDATION_ERROR/i.test(message)) return 'Confira os campos informados. Tipo e saldo inicial ficam protegidos depois que o cadastro é criado.';
    if (/403|FORBIDDEN/i.test(message)) return 'Seu perfil não possui permissão para esta alteração.';
    return message;
  }

  async function saveEditor() {
    if (!editor || mutationBusy) return;
    const name = editor.draft.name.trim();
    if (name.length < 2) return setMutationMessage('Informe um nome com pelo menos 2 caracteres.');
    const creating = editor.mode === 'create';
    const fingerprint = JSON.stringify({
      action: creating ? 'create' : 'update',
      tab: editor.tab,
      id: editor.id || null,
      expectedUpdatedAt: editor.expectedUpdatedAt || null,
      draft: editor.draft,
    });
    const operationId = mutationOperationId(fingerprint);
    setMutationBusy(true);
    setMutationMessage(creating ? 'Cadastrando…' : 'Salvando alteração…');
    try {
      if (editor.tab === 'accounts') {
        const saved = creating
          ? await financeClient.createAccount({
              name,
              type: editor.draft.type as Account['type'],
              institution: editor.draft.institution.trim() || null,
              openingBalance: parseBrazilianNumber(editor.draft.openingBalance) ?? 0,
              operationId,
            })
          : await financeClient.updateAccount(editor.id!, {
              name,
              institution: editor.draft.institution.trim() || null,
              expectedUpdatedAt: editor.expectedUpdatedAt,
              operationId,
            });
        const nextAccounts = replaceCatalogItem(accounts, saved, creating);
        setAccounts(nextAccounts);
        commitCatalogSnapshot(nextAccounts, categories, payments);
      } else if (editor.tab === 'categories') {
        const saved = creating
          ? await financeClient.createCategory({
              name,
              group: editor.draft.group.trim() || null,
              type: (editor.draft.type || null) as Category['type'],
              operationId,
            })
          : await financeClient.updateCategory(editor.id!, {
              name,
              group: editor.draft.group.trim() || null,
              expectedUpdatedAt: editor.expectedUpdatedAt,
              operationId,
            });
        const nextCategories = replaceCatalogItem(categories, saved, creating);
        setCategories(nextCategories);
        commitCatalogSnapshot(accounts, nextCategories, payments);
      } else {
        const saved = creating
          ? await financeClient.createPaymentMethod({
              name,
              type: (editor.draft.type || null) as PaymentMethod['type'],
              operationId,
            })
          : await financeClient.updatePaymentMethod(editor.id!, {
              name,
              expectedUpdatedAt: editor.expectedUpdatedAt,
              operationId,
            });
        const nextPayments = replaceCatalogItem(payments, saved, creating);
        setPayments(nextPayments);
        commitCatalogSnapshot(accounts, categories, nextPayments);
      }
      clearMutationOperation();
      setMutationMessage(creating ? 'Cadastro criado e confirmado pelo servidor.' : 'Alteração salva e confirmada pelo servidor.');
      setEditor(null);
    } catch (error) {
      setMutationMessage(mutationError(error));
    } finally {
      setMutationBusy(false);
    }
  }

  function changeActive(row: CatalogRow, active: boolean) {
    if (mutationBusy || tab === 'cards') return;
    if (!active && !canDeactivate) {
      setMutationMessage('Somente ADMIN ou MANAGER pode desativar cadastros.');
      return;
    }
    if (active && !canWrite) return;
    clearMutationOperation();
    setActiveConfirm({ row, active });
  }

  async function confirmChangeActive() {
    if (!activeConfirm || mutationBusy) return;
    const { row, active } = activeConfirm;
    const operationId = mutationOperationId(JSON.stringify({
      action: active ? 'reactivate' : 'deactivate',
      tab,
      id: row.id,
      expectedUpdatedAt: row.updatedAt || null,
    }));
    const meta = { operationId, expectedUpdatedAt: row.updatedAt };
    setMutationBusy(true);
    setMutationMessage(active ? 'Reativando cadastro…' : 'Desativando cadastro…');
    try {
      if (tab === 'accounts') {
        const saved = active
          ? await financeClient.updateAccount(row.id, { isActive: true, ...meta })
          : await financeClient.deactivateAccount(row.id, meta);
        const nextAccounts = replaceCatalogItem(accounts, saved, false);
        setAccounts(nextAccounts);
        commitCatalogSnapshot(nextAccounts, categories, payments);
      } else if (tab === 'categories') {
        const saved = active
          ? await financeClient.updateCategory(row.id, { isActive: true, ...meta })
          : await financeClient.deactivateCategory(row.id, meta);
        const nextCategories = replaceCatalogItem(categories, saved, false);
        setCategories(nextCategories);
        commitCatalogSnapshot(accounts, nextCategories, payments);
      } else {
        const saved = active
          ? await financeClient.updatePaymentMethod(row.id, { isActive: true, ...meta })
          : await financeClient.deactivatePaymentMethod(row.id, meta);
        const nextPayments = replaceCatalogItem(payments, saved, false);
        setPayments(nextPayments);
        commitCatalogSnapshot(accounts, categories, nextPayments);
      }
      clearMutationOperation();
      setMutationMessage(active ? 'Cadastro reativado com o histórico preservado.' : 'Cadastro desativado. Nenhum histórico foi apagado.');
      setActiveConfirm(null);
    } catch (error) {
      setMutationMessage(mutationError(error));
    } finally {
      setMutationBusy(false);
    }
  }

  return <section className="px-screen">
    <PageIntro />
    <section className="px-screen-kpis">
      <article><span>Contas ativas</span><strong>{activeAccounts.length}</strong><small>Base financeira</small></article>
      <article><span>Classificações</span><strong>{activeCategories.length}</strong><small>Organização das despesas</small></article>
      <article><span>Formas de pagamento</span><strong>{activePayments.length}</strong><small>Meios ativos</small></article>
      <article><span>Cartões ativos</span><strong>{data.cards.filter((item) => item.isActive).length}</strong><small>Identidade automática MEG</small></article>
    </section>

    <div className="px-tabbar px-catalog-tabs">
      <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Contas</button>
      <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Classificações</button>
      <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Formas de pagamento</button>
      <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>Cartões</button>
    </div>

    <section className="px-card px-catalog-panel px-table-card">
      <div className="px-panel-head"><div><span>Base real</span><h2>{tab === 'accounts' ? 'Contas' : tab === 'categories' ? 'Classificações' : tab === 'payments' ? 'Formas de pagamento' : 'Cartões'}</h2></div><button className="px-secondary-action" type="button" disabled={!canWrite} onClick={openNew}>{tab === 'cards' ? 'Gerenciar cartões' : '＋ Novo cadastro'}</button></div>
      {mutationMessage ? <div className={`px-catalog-feedback ${/não|erro|confira|permissão/i.test(mutationMessage) ? 'warn' : 'ok'}`}>{mutationMessage}</div> : null}

      <div className="px-toolbar px-catalog-grid-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar em todas as colunas deste cadastro" /></label>
        <span className="px-toolbar-note">{visibleRows.length} de {rows.length} exibido(s)</span>
      </div>

      {activeFilterKeys.length || sort || search ? <div className="px-grid-active-filters">
        <span>Filtros do cadastro</span>
        {search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearch('')} aria-label="Limpar busca">×</button></span> : null}
        {activeFilterKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{filterSummary(labels[key], filters[key])}<button type="button" onClick={() => clearFilter(key)} aria-label={`Remover filtro ${labels[key]}`}>×</button></span>)}
        {sort ? <span className="px-grid-filter-chip">Ordenação: {labels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={clearSort} aria-label="Remover ordenação">×</button></span> : null}
        <button className="px-grid-clear-all" type="button" onClick={clearGrid}>Limpar grade</button>
      </div> : null}

      <div className="px-table-scroll">
        <table className="px-data-table">
          <thead><tr>
            {tab === 'accounts' ? <><th>{header('Conta', 'name', 'text')}</th><th>{header('Tipo', 'type', 'multi', options.type)}</th><th>{header('Instituição', 'institution', 'multi', options.institution)}</th><th>{header('Saldo inicial', 'openingBalance', 'number')}</th><th>{header('Status', 'status', 'multi', options.status)}</th><th>Ações</th></> : null}
            {tab === 'categories' ? <><th>{header('Classificação', 'name', 'text')}</th><th>{header('Grupo', 'group', 'multi', options.group)}</th><th>{header('Tipo', 'type', 'multi', options.type)}</th><th>{header('Status', 'status', 'multi', options.status)}</th><th>Ações</th></> : null}
            {tab === 'payments' ? <><th>{header('Forma', 'name', 'text')}</th><th>{header('Tipo', 'type', 'multi', options.type)}</th><th>{header('Status', 'status', 'multi', options.status)}</th><th>Ações</th></> : null}
            {tab === 'cards' ? <><th>{header('Cartão', 'name', 'text')}</th><th>{header('Emissor', 'issuer', 'multi', options.issuer)}</th><th>{header('Bandeira', 'brand', 'multi', options.brand)}</th><th>{header('Limite', 'creditLimit', 'number')}</th><th>{header('Fechamento', 'closingDay', 'number')}</th><th>{header('Vencimento', 'dueDay', 'number')}</th><th>Ações</th></> : null}
          </tr></thead>
          <tbody>{visibleRows.map((row) => {
            if (tab === 'accounts') return <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.type}</td><td>{row.institution}</td><td className="px-money">{money.format(row.openingBalance || 0)}</td><td><span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span></td><td><div className="px-catalog-actions"><button type="button" onClick={() => openEdit(row)} disabled={!canWrite}>Editar</button><button type="button" onClick={() => void changeActive(row, row.status !== 'Ativa')} disabled={row.status === 'Ativa' ? !canDeactivate : !canWrite}>{row.status === 'Ativa' ? 'Desativar' : 'Reativar'}</button></div></td></tr>;
            if (tab === 'categories') return <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.group}</td><td>{row.type}</td><td><span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span></td><td><div className="px-catalog-actions"><button type="button" onClick={() => openEdit(row)} disabled={!canWrite}>Editar</button><button type="button" onClick={() => void changeActive(row, row.status !== 'Ativa')} disabled={row.status === 'Ativa' ? !canDeactivate : !canWrite}>{row.status === 'Ativa' ? 'Desativar' : 'Reativar'}</button></div></td></tr>;
            if (tab === 'payments') return <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.type}</td><td><span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span></td><td><div className="px-catalog-actions"><button type="button" onClick={() => openEdit(row)} disabled={!canWrite}>Editar</button><button type="button" onClick={() => void changeActive(row, row.status !== 'Ativa')} disabled={row.status === 'Ativa' ? !canDeactivate : !canWrite}>{row.status === 'Ativa' ? 'Desativar' : 'Reativar'}</button></div></td></tr>;
            const identity = row.card ? resolvePhoenixCardIdentity(row.card) : null;
            return <tr key={row.id}><td><span className="px-catalog-card-name"><span className="px-mini-card" style={{ background: identity?.background }}>{identity?.miniLabel || row.name.slice(0, 6).toUpperCase()}</span><strong>{row.name}</strong></span></td><td>{row.issuer}</td><td>{row.brand}</td><td className="px-money">{money.format(row.creditLimit || 0)}</td><td>dia {row.closingDay}</td><td>dia {row.dueDay}</td><td><div className="px-catalog-actions"><button type="button" onClick={() => openEdit(row)} disabled={!canWrite}>Gerenciar</button></div></td></tr>;
          })}</tbody>
        </table>
        {!visibleRows.length ? <p className="px-empty">Nenhum cadastro corresponde aos filtros aplicados.</p> : null}
      </div>

      <div className="px-catalog-mobile-list" aria-label="Cadastros">
        {visibleRows.map((row) => <article key={row.id} className="px-catalog-mobile-item">
          <div><strong>{row.name}</strong><small>{tab === 'accounts' ? `${row.type} · ${row.institution}` : tab === 'categories' ? `${row.group} · ${row.type}` : tab === 'payments' ? row.type : `${row.issuer} · ${row.brand}`}</small></div>
          {tab !== 'cards' ? <span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span> : <span className="px-status reconciled">Cartão</span>}
          <div className="px-catalog-mobile-actions"><button type="button" onClick={() => openEdit(row)} disabled={!canWrite}>{tab === 'cards' ? 'Gerenciar' : 'Editar'}</button>{tab !== 'cards' ? <button type="button" onClick={() => void changeActive(row, row.status !== 'Ativa')} disabled={row.status === 'Ativa' ? !canDeactivate : !canWrite}>{row.status === 'Ativa' ? 'Desativar' : 'Reativar'}</button> : null}</div>
        </article>)}
      </div>
    </section>

    {activeConfirm && typeof document !== 'undefined' ? createPortal(<div className="px-meg-confirm-overlay px-catalog-active-confirm">
      <button className="px-meg-confirm-backdrop" type="button" aria-label="Cancelar" disabled={mutationBusy} onClick={() => setActiveConfirm(null)} />
      <section className="px-meg-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="px-catalog-active-title">
        <div className="px-meg-confirm-icon" aria-hidden="true">!</div>
        <div className="px-meg-confirm-copy">
          <span className="px-kicker">Cadastro operacional</span>
          <h3 id="px-catalog-active-title">{activeConfirm.active ? 'Reativar cadastro?' : 'Desativar cadastro?'}</h3>
          <p><strong>{activeConfirm.row.name}</strong> · O histórico financeiro existente será preservado. {activeConfirm.active ? 'O item voltará a aparecer nos novos lançamentos.' : 'O item deixará de aparecer para novos usos.'}</p>
        </div>
        <button className="px-meg-confirm-close" type="button" aria-label="Cancelar" disabled={mutationBusy} onClick={() => setActiveConfirm(null)}>×</button>
        <div className="px-meg-confirm-actions">
          <button className="px-meg-confirm-secondary" type="button" disabled={mutationBusy} onClick={() => setActiveConfirm(null)}>Cancelar</button>
          <button className={activeConfirm.active ? 'px-primary-action' : 'px-meg-confirm-danger'} type="button" disabled={mutationBusy} aria-busy={mutationBusy} onClick={() => { void confirmChangeActive(); }}>
            {mutationBusy ? 'Confirmando…' : activeConfirm.active ? 'Reativar' : 'Desativar'}
          </button>
        </div>
      </section>
    </div>, document.body) : null}

    {editor ? <div className="px-catalog-editor-layer">
      <button type="button" className="px-catalog-editor-backdrop" aria-label="Fechar cadastro" onClick={() => !mutationBusy && setEditor(null)} />
      <aside className="px-catalog-editor" role="dialog" aria-modal="true" aria-label={editor.mode === 'create' ? 'Novo cadastro' : 'Editar cadastro'}>
        <header><div><span className="px-kicker">{editor.mode === 'create' ? 'Novo cadastro' : 'Editar cadastro'}</span><h2>{editor.tab === 'accounts' ? 'Conta' : editor.tab === 'categories' ? 'Classificação' : 'Forma de pagamento'}</h2></div><button type="button" onClick={() => setEditor(null)} disabled={mutationBusy}>×</button></header>
        <div className="px-catalog-editor-body">
          <label><span>Nome *</span><input value={editor.draft.name} maxLength={120} onChange={(event) => updateDraft('name', event.target.value)} /></label>
          {editor.tab === 'accounts' ? <>
            <label><span>Tipo *</span><select value={editor.draft.type} disabled={editor.mode === 'edit'} onChange={(event) => updateDraft('type', event.target.value)}>{accountTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{editor.mode === 'edit' ? <small>Protegido após a criação para não alterar a natureza financeira da conta.</small> : null}</label>
            <label><span>Instituição</span><input value={editor.draft.institution} maxLength={120} onChange={(event) => updateDraft('institution', event.target.value)} /></label>
            <label><span>Saldo inicial</span><input inputMode="decimal" value={editor.draft.openingBalance} disabled={editor.mode === 'edit'} onChange={(event) => updateDraft('openingBalance', event.target.value)} />{editor.mode === 'edit' ? <small>Protegido após a criação. Ajustes de saldo devem ocorrer por lançamento, preservando o histórico.</small> : null}</label>
          </> : null}
          {editor.tab === 'categories' ? <>
            <label><span>Grupo</span><input value={editor.draft.group} maxLength={120} onChange={(event) => updateDraft('group', event.target.value)} /></label>
            <label><span>Tipo</span><select value={editor.draft.type} disabled={editor.mode === 'edit'} onChange={(event) => updateDraft('type', event.target.value)}>{categoryTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{editor.mode === 'edit' ? <small>Tipo protegido para não reclassificar lançamentos antigos silenciosamente.</small> : null}</label>
          </> : null}
          {editor.tab === 'payments' ? <label><span>Tipo</span><select value={editor.draft.type} disabled={editor.mode === 'edit'} onChange={(event) => updateDraft('type', event.target.value)}>{paymentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{editor.mode === 'edit' ? <small>Tipo protegido depois da criação para manter as regras de pagamento consistentes.</small> : null}</label> : null}
          <p>Alterar nome ou instituição não apaga o histórico. Campos estruturais ficam protegidos após a criação; desativar impede novos usos sem excluir lançamentos anteriores.</p>
          {mutationMessage ? <div className="px-catalog-feedback warn">{mutationMessage}</div> : null}
        </div>
        <footer><button type="button" onClick={() => setEditor(null)} disabled={mutationBusy}>Cancelar</button><button type="button" className="px-primary-action" onClick={() => void saveEditor()} disabled={mutationBusy}>{mutationBusy ? 'Salvando…' : 'Salvar'}</button></footer>
      </aside>
    </div> : null}
  </section>;
}
