import { FormEvent, useEffect, useState } from 'react';
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

export function FinancialCatalogs() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [type, setType] = useState('checking');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    setOpeningBalance('0');
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
        await financeClient.createAccount({
          name,
          type,
          institution: detail || null,
          openingBalance: Number(openingBalance)
        });
      } else if (tab === 'categories') {
        await financeClient.createCategory({ name, group: detail || null, type: type as 'income' | 'expense' });
      } else {
        await financeClient.createPaymentMethod({ name, type });
      }
      resetForm(tab);
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

  return (
    <section className="page catalogs-page">
      <header className="page-header">
        <div>
          <span>Cadastros financeiros</span>
          <h1>Base operacional do MEG</h1>
          <p>Contas, categorias e formas de pagamento persistidas na API.</p>
        </div>
        <div className="catalog-role">Perfil: <strong>{role}</strong></div>
      </header>

      <div className="catalog-tabs">
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => resetForm('accounts')}>Contas</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => resetForm('categories')}>Categorias</button>
        <button className={tab === 'paymentMethods' ? 'active' : ''} onClick={() => resetForm('paymentMethods')}>Formas de pagamento</button>
      </div>

      <div className="catalog-layout">
        <form className="meg-card catalog-form" onSubmit={handleSubmit}>
          <span className="meg-eyebrow">Novo cadastro</span>
          <h3>{tab === 'accounts' ? 'Nova conta' : tab === 'categories' ? 'Nova categoria' : 'Nova forma de pagamento'}</h3>
          <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required disabled={!canWrite} /></label>
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
          {tab === 'accounts' && <label>Saldo inicial<input type="number" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} disabled={!canWrite} /></label>}
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" disabled={!canWrite || busy}>{canWrite ? busy ? 'Salvando...' : 'Salvar cadastro' : 'Perfil somente leitura'}</button>
        </form>

        <div className="meg-card catalog-list">
          <div className="catalog-list-heading"><div><span className="meg-eyebrow">Registros</span><h3>{rows.length} cadastrados</h3></div><button onClick={() => void load()}>Atualizar</button></div>
          <div className="catalog-table">
            {rows.map((item) => (
              <article key={item.id} className={!item.isActive ? 'inactive' : ''}>
                <div><strong>{item.name}</strong><span>{getItemDetail(item)}</span></div>
                <span className={`status-pill ${item.isActive ? 'active' : ''}`}>{item.isActive ? 'Ativo' : 'Inativo'}</span>
                {item.isActive && canDeactivate && <button onClick={() => void deactivate(tab, item.id)} disabled={busy}>Desativar</button>}
              </article>
            ))}
            {rows.length === 0 && <p className="catalog-empty">Nenhum cadastro encontrado.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
