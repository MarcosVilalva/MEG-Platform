import { FormEvent, useEffect, useMemo, useState } from 'react';
import { readSession } from '../../app/auth-client';
import {
  financeClient,
  type Account,
  type Category,
  type FinancialEvent,
  type PaymentMethod
} from '../../app/finance-client';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PersistentTransactions() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'planned' | 'paid'>('planned');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';
  const canArchive = role === 'ADMIN' || role === 'MANAGER';

  async function load() {
    setError('');
    try {
      const [eventData, accountData, categoryData, methodData] = await Promise.all([
        financeClient.listEvents(),
        financeClient.listAccounts(),
        financeClient.listCategories(),
        financeClient.listPaymentMethods()
      ]);
      setEvents(eventData.filter((item) => item.status !== 'archived'));
      setAccounts(accountData.filter((item) => item.isActive));
      setCategories(categoryData.filter((item) => item.isActive));
      setMethods(methodData.filter((item) => item.isActive));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LOAD_ERROR');
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter((item) => [
      item.description,
      item.account?.name,
      item.category?.name,
      item.paymentMethod?.name
    ].join(' ').toLowerCase().includes(term));
  }, [events, search]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    const value = Number(amount.replace(',', '.'));
    if (!description.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Informe descrição e valor válido.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await financeClient.createEvent({
        description: description.trim(),
        type,
        status,
        date,
        amount: value,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        paymentMethodId: paymentMethodId || undefined
      });
      setDescription('');
      setAmount('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SAVE_ERROR');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: FinancialEvent, next: 'paid' | 'reconciled') {
    if (!canWrite) return;
    setBusy(true);
    try {
      await financeClient.updateEvent(item.id, { status: next as 'paid' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string) {
    if (!canArchive || !confirm('Arquivar este lançamento?')) return;
    setBusy(true);
    try {
      await financeClient.archiveEvent(id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header compact">
        <div>
          <span>Finanças pessoais</span>
          <h1>Movimentações reais</h1>
          <p>Receitas e despesas salvas no banco e vinculadas aos seus cadastros.</p>
        </div>
        <div className="catalog-role">Perfil: <strong>{role}</strong></div>
      </header>

      <div className="catalog-layout">
        <form className="meg-card catalog-form" onSubmit={submit}>
          <span className="meg-eyebrow">Novo lançamento</span>
          <h3>{type === 'income' ? 'Nova receita' : 'Nova despesa'}</h3>
          <label>Tipo<select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} disabled={!canWrite}><option value="expense">Despesa</option><option value="income">Receita</option></select></label>
          <label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} required disabled={!canWrite} /></label>
          <label>Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={!canWrite} /></label>
          <label>Valor<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required disabled={!canWrite} /></label>
          <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as 'planned' | 'paid')} disabled={!canWrite}><option value="planned">Previsto</option><option value="paid">Pago/Recebido</option></select></label>
          <label>Conta<select value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={!canWrite}><option value="">Sem conta</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!canWrite}><option value="">Sem categoria</option>{categories.filter((item) => !item.type || item.type === type).map((item) => <option key={item.id} value={item.id}>{item.group ? `${item.group} — ` : ''}{item.name}</option>)}</select></label>
          <label>Forma de pagamento<select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} disabled={!canWrite}><option value="">Não informada</option>{methods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" disabled={!canWrite || busy}>{canWrite ? busy ? 'Salvando...' : 'Salvar lançamento' : 'Perfil somente leitura'}</button>
        </form>

        <div className="meg-card catalog-list">
          <div className="catalog-list-heading">
            <div><span className="meg-eyebrow">Histórico</span><h3>{filtered.length} lançamentos</h3></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar movimentação" />
          </div>
          <div className="catalog-table">
            {filtered.map((item) => {
              const signed = Number(item.signedAmount);
              return (
                <article key={item.id}>
                  <div>
                    <strong>{item.description}</strong>
                    <span>{new Date(item.date).toLocaleDateString('pt-BR')} · {item.category?.name || 'Sem categoria'} · {item.account?.name || 'Sem conta'}</span>
                  </div>
                  <strong className={signed >= 0 ? 'positive' : 'negative'}>{brl.format(Math.abs(Number(item.amount)))}</strong>
                  <span className={`status-pill ${item.status !== 'planned' ? 'active' : ''}`}>{item.status === 'planned' ? 'Previsto' : item.status === 'paid' ? 'Pago' : 'Conciliado'}</span>
                  <div className="table-actions">
                    {item.status === 'planned' && canWrite && <button onClick={() => void changeStatus(item, 'paid')} disabled={busy}>Marcar pago</button>}
                    {item.status === 'paid' && canWrite && <button onClick={() => void changeStatus(item, 'reconciled')} disabled={busy}>Conciliar</button>}
                    {canArchive && <button className="danger" onClick={() => void archive(item.id)} disabled={busy}>Arquivar</button>}
                  </div>
                </article>
              );
            })}
            {filtered.length === 0 && <p className="catalog-empty">Nenhuma movimentação encontrada.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}