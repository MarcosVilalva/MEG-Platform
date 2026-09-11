import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MEGCurrencyInput } from '@ui';
import { formatBRLValue, parseBRL } from '@shared/money';
import { readSession } from '../../app/auth-client';
import {
  financeClient,
  type Account,
  type Category,
  type PaymentMethod
} from '../../app/finance-client';

type Tab = 'accounts' | 'categories' | 'paymentMethods';
type CatalogItem = Account | Category | PaymentMethod;

function getItemDetail(item: CatalogItem): string {
  if ('institution' in item) return String(item.institution || item.type || '');
  if ('group' in item) return String(item.group || item.type || '');
  return String(item.type || '');
}

export function FinancialCatalogs({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [type, setType] = useState('checking');
  const [openingBalance, setOpeningBalance] = useState(() => formatBRLValue(0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';
  const canDeactivate = role === 'ADMIN' || role === 'MANAGER';

  async function load() {
    setError('');
    try {
      const [accountData, categoryData, paymentData] = await Promise.all([
        financeClient.listAccounts(),
        financeClient.listCategories(),
        financeClient.listPaymentMethods()
      ]);
      setAccounts(accountData);
      setCategories(categoryData);
      setPaymentMethods(paymentData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LOAD_ERROR');
    }
  }

  useEffect(() => { void load(); }, []);

  function resetForm(nextTab?: Tab) {
    if (nextTab) setTab(nextTab);
    setName('');
    setDetail('');
    setOpeningBalance(formatBRLValue(0));
    setType(nextTab === 'categories' ? 'expense' : nextTab === 'paymentMethods' ? 'instant' : 'checking');
    setError('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setError('');
    try {
      if (tab === 'accounts') {
        const openingBalanceValue = parseBRL(openingBalance);
        await financeClient.createAccount({
          name,
          type,
          institution: detail || null,
          openingBalance: Number.isFinite(openingBalanceValue) ? openingBalanceValue : 0
        });
      } else if (tab === 'categories') {
        await financeClient.createCategory({ name, group: detail || null, type: type as 'income' | 'expense' });
      } else {
        await financeClient.createPaymentMethod({ name, type });
      }
      resetForm(tab);
      setFormOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SAVE_ERROR');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(kind: Tab, id: string) {
    if (!canDeactivate) return;
    setBusy(true);
    try {
      if (kind === 'accounts') await financeClient.deactivateAccount(id);
      if (kind === 'categories') await financeClient.deactivateCategory(id);
      if (kind === 'paymentMethods') await financeClient.deactivatePaymentMethod(id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const rows: CatalogItem[] = tab === 'accounts' ? accounts : tab === 'categories' ? categories : paymentMethods;
  const visibleRows = useMemo(() => rows.filter((item) => `${item.name} ${getItemDetail(item)}`.toLowerCase().includes(query.trim().toLowerCase())), [rows, query]);

  return (
    <section className="page catalogs-page">
      <header className="page-header">
        <div>
          <span>Cadastros</span>
          <h1>Base configurável do MEG</h1>
          <p>Centralize as opções usadas nos lançamentos sem alterar registros históricos.</p>
        </div>
        <div className="page-header-actions"><span className="status-pill active">Histórico protegido</span>{canWrite && <button className="meg-icon-action meg-add" title="Novo cadastro" aria-label="Novo cadastro" onClick={() => setFormOpen(true)}>＋</button>}</div>
      </header>

      <section className="catalog-summary"><article><span>Contas financeiras</span><strong>{accounts.filter((item) => item.isActive).length} ativas</strong><small>Monetário e benefício</small></article><article><span>Classificações</span><strong>{categories.filter((item) => item.isActive).length} ativas</strong><small>Aplicadas aos lançamentos</small></article><article><span>Grupos</span><strong>{new Set(categories.filter((item) => item.isActive && item.group).map((item) => item.group)).size} ativos</strong><small>Despesas e recebimentos</small></article><article><span>Formas de pagamento</span><strong>{paymentMethods.filter((item) => item.isActive).length} ativas</strong><small>Opções operacionais</small></article></section>

      <div className="catalog-sticky-tabs"><div className="catalog-tabs"><button className={tab === 'accounts' ? 'active' : ''} onClick={() => resetForm('accounts')}>Contas financeiras</button><button className={tab === 'categories' ? 'active' : ''} onClick={() => resetForm('categories')}>Classificações e grupos</button><button className={tab === 'paymentMethods' ? 'active' : ''} onClick={() => resetForm('paymentMethods')}>Formas de pagamento</button><button onClick={() => onNavigate?.('cards')}>Cartões</button></div></div>

      <div className="meg-card catalog-list">
        <div className="catalog-list-heading"><div><span className="meg-eyebrow">Registros</span><h3>{visibleRows.length} de {rows.length} cadastrados</h3></div><button onClick={() => void load()}>Atualizar</button></div>
        <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por nome, instituição, classificação ou grupo" /></label>
        <div className="catalog-table">
          {visibleRows.map((item) => <article key={item.id} className={!item.isActive ? 'inactive' : ''}><div><strong>{item.name}</strong><span>{getItemDetail(item) || 'Sem detalhe complementar'}</span></div><span className={`status-pill ${item.isActive ? 'active' : ''}`}>{item.isActive ? 'Ativo' : 'Inativo'}</span>{item.isActive && canDeactivate && <button onClick={() => void deactivate(tab, item.id)} disabled={busy}>Desativar</button>}</article>)}
          {visibleRows.length === 0 && <p className="catalog-empty">Nenhum cadastro encontrado.</p>}
        </div>
      </div>

      {formOpen && <><button className="launch-drawer-backdrop" aria-label="Fechar" onClick={() => setFormOpen(false)} /><aside className="launch-drawer" role="dialog" aria-modal="true"><header><div><span>Novo cadastro</span><h2>{tab === 'accounts' ? 'Nova conta financeira' : tab === 'categories' ? 'Nova classificação' : 'Nova forma de pagamento'}</h2></div><button onClick={() => setFormOpen(false)} aria-label="Fechar">×</button></header><form className="catalog-form" onSubmit={handleSubmit}>
          <span className="meg-eyebrow">Novo cadastro</span>
          <h3>{tab === 'accounts' ? 'Dados da conta' : tab === 'categories' ? 'Classificação e grupo' : 'Dados da forma de pagamento'}</h3>
          <label>Nome *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} minLength={2} required disabled={!canWrite} /></label>
          {tab !== 'paymentMethods' && (
            <label>{tab === 'accounts' ? 'Instituição' : 'Grupo'}<input value={detail} onChange={(event) => setDetail(event.target.value)} disabled={!canWrite} /></label>
          )}
          <label>Tipo
            <select value={type} onChange={(event) => setType(event.target.value)} disabled={!canWrite}>
              {tab === 'accounts' && <><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="cash">Dinheiro</option><option value="investment">Investimento</option><option value="credit">Crédito</option></>}
              {tab === 'categories' && <><option value="expense">Despesa</option><option value="income">Receita</option></>}
              {tab === 'paymentMethods' && <><option value="instant">PIX</option><option value="bill">Boleto</option><option value="credit">Crédito</option><option value="debit">Débito</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="other">Outro</option></>}
            </select>
          </label>
          {tab === 'accounts' && <label>Saldo inicial<MEGCurrencyInput value={openingBalance} onValueChange={setOpeningBalance} allowNegative disabled={!canWrite} /></label>}
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" disabled={!canWrite || busy}>{busy ? 'Salvando...' : 'Salvar cadastro'}</button>
        </form></aside></>}
    </section>
  );
}
