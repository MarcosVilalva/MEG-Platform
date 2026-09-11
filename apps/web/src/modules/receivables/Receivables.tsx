import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MEGCurrencyInput } from '@ui';
import { formatBRLValue, parseBRL } from '@shared/money';
import { financeClient, type Account, type PaymentMethod } from '../../app/finance-client';
import { receivablesClient, type Customer, type Receivable } from '../../app/receivables-client';
import { readSession } from '../../app/auth-client';
import { dateInSaoPaulo } from '../../app/calendar';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Receivables() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Receivable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => dateInSaoPaulo());
  const [receiving, setReceiving] = useState<Receivable | null>(null);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<'customer' | 'receivable' | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';

  async function load() {
    setError('');
    try {
      const [customerData, receivableData, accountData, methodData] = await Promise.all([
        receivablesClient.listCustomers(),
        receivablesClient.listReceivables(),
        financeClient.listAccounts(),
        financeClient.listPaymentMethods()
      ]);
      setCustomers(customerData.filter((item) => item.isActive));
      setItems(receivableData);
      setAccounts(accountData.filter((item) => item.isActive));
      setMethods(methodData.filter((item) => item.isActive));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LOAD_ERROR');
    }
  }

  useEffect(() => { void load(); }, []);

  const totals = useMemo(() => ({
    open: items.reduce((sum, item) => sum + Number(item.openAmount), 0),
    overdue: items.filter((item) => item.status !== 'paid' && new Date(item.dueDate) < new Date()).reduce((sum, item) => sum + Number(item.openAmount), 0),
    paid: items.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.totalAmount), 0)
  }), [items]);

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !customerName.trim()) return;
    setBusy(true);
    try {
      await receivablesClient.createCustomer({ name: customerName.trim() });
      setCustomerName('');
      setEditor(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createReceivable(event: FormEvent) {
    event.preventDefault();
    const value = parseBRL(amount);
    if (!canWrite || !description.trim() || !Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try {
      await receivablesClient.createReceivable({
        customerId: customerId || null,
        description: description.trim(),
        totalAmount: value,
        dueDate
      });
      setDescription('');
      setAmount('');
      setEditor(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const visibleItems = useMemo(() => items.filter((item) => {
    const overdue = item.status !== 'paid' && new Date(item.dueDate) < new Date();
    const matchesText = `${item.description} ${item.customer?.name || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'open' && item.status !== 'paid') || (statusFilter === 'overdue' && overdue) || (statusFilter === 'paid' && item.status === 'paid');
    return matchesText && matchesStatus;
  }), [items, query, statusFilter]);

  async function confirmReceipt(event: FormEvent) {
    event.preventDefault();
    if (!receiving) return;
    const value = parseBRL(receiptAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try {
      await receivablesClient.receive(receiving.id, {
        amount: value,
        receivedAt: dateInSaoPaulo(),
        accountId: accountId || null,
        paymentMethodId: paymentMethodId || null
      });
      setReceiving(null);
      setReceiptAmount('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="receivables" className="page receivables-page">
      <header className="page-head page-header compact">
        <div><span>Contas a receber</span><h1>Títulos e recebimentos</h1><p>Valor original, vencimento e saldo aberto permanecem rastreáveis. Recebimentos parciais reduzem o saldo sem quitar o título antes de chegar a zero.</p></div>
        {canWrite && <div className="page-header-actions"><button className="meg-icon-action" title="Cadastrar pagador" aria-label="Cadastrar pagador" onClick={() => setEditor('customer')}>♙</button><button className="header-primary" onClick={() => setEditor('receivable')}>＋ Nova receita</button></div>}
      </header>

      <div className="kpi-grid">
        <article className="meg-card"><span>Em aberto</span><strong>{brl.format(totals.open)}</strong></article>
        <article className="meg-card"><span>Vencido</span><strong>{brl.format(totals.overdue)}</strong></article>
        <article className="meg-card"><span>Recebido</span><strong>{brl.format(totals.paid)}</strong></article>
      </div>

      {error && <div className="auth-error">{error}</div>}
      <div className="meg-card catalog-list receivables-workspace">
          <div className="catalog-list-heading"><div><span className="meg-eyebrow">Agenda de recebimentos</span><h3>{visibleItems.length} de {items.length} títulos</h3></div><button onClick={() => void load()}>Atualizar</button></div>
          <div className="receivable-filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar descrição ou pagador" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="open">Em aberto</option><option value="overdue">Vencidos</option><option value="paid">Recebidos</option><option value="all">Todos</option></select></div>
          <div className="catalog-table">
            {visibleItems.map((item) => {
              const overdue = item.status !== 'paid' && new Date(item.dueDate) < new Date();
              return <article key={item.id}>
                <div><strong>{item.description}</strong><span>{item.customer?.name || 'Sem pagador'} · vence {new Date(item.dueDate).toLocaleDateString('pt-BR')}</span></div>
                <strong>{brl.format(Number(item.openAmount))}</strong>
                <span className={`status-pill ${item.status === 'paid' ? 'active' : ''}`}>{item.status === 'paid' ? 'Recebido' : overdue ? 'Vencido' : item.status === 'partial' ? 'Parcial' : 'Em aberto'}</span>
                {item.status !== 'paid' && canWrite && <button onClick={() => { setReceiving(item); setReceiptAmount(formatBRLValue(item.openAmount)); }}>Receber</button>}
              </article>;
            })}
            {!visibleItems.length && <p className="catalog-empty">Nenhum recebimento corresponde aos filtros.</p>}
          </div>
      </div>

      {editor && <><button className="launch-drawer-backdrop" aria-label="Fechar" onClick={() => setEditor(null)} /><aside className="launch-drawer" role="dialog" aria-modal="true"><header><div><span>{editor === 'customer' ? 'Cadastro rápido' : 'Nova receita'}</span><h2>{editor === 'customer' ? 'Novo pagador' : 'Conta a receber'}</h2></div><button onClick={() => setEditor(null)} aria-label="Fechar">×</button></header>{editor === 'customer' ? <form className="catalog-form" onSubmit={createCustomer}><label>Nome *<input autoFocus value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></label><button className="auth-submit" disabled={busy}>Cadastrar pagador</button></form> : <form className="catalog-form" onSubmit={createReceivable}><label>Descrição *<input autoFocus value={description} onChange={(e) => setDescription(e.target.value)} required /></label><label>Pagador<select value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Não informado</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Valor *<MEGCurrencyInput value={amount} onValueChange={setAmount} required /></label><label>Vencimento *<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></label><p className="drawer-note">Receitas são registradas como previstas e passam a realizadas somente após a baixa.</p><button className="auth-submit" disabled={busy}>Salvar recebimento</button></form>}</aside></>}

      {receiving && <div className="payment-backdrop"><form className="payment-confirm" onSubmit={confirmReceipt}><header><div><span>Baixa de recebimento</span><h2>{receiving.description}</h2></div><button type="button" onClick={() => setReceiving(null)}>×</button></header><p>Confirme o valor e o destino. A receita somente será realizada após esta confirmação.</p><div className="form-grid"><label>Valor *<MEGCurrencyInput value={receiptAmount} onValueChange={setReceiptAmount} required /></label><label>Conta<select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Não informada</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Forma de recebimento<select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}><option value="">Não informada</option>{methods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><footer><button type="button" onClick={() => setReceiving(null)}>Cancelar</button><button className="confirm" disabled={busy}>Confirmar recebimento</button></footer></form></div>}
    </section>
  );
}
