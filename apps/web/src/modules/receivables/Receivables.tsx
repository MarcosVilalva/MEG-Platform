import { FormEvent, useEffect, useMemo, useState } from 'react';
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
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createReceivable(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
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
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmReceipt(event: FormEvent) {
    event.preventDefault();
    if (!receiving) return;
    const value = Number(receiptAmount.replace(',', '.'));
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
    <section className="page">
      <header className="page-header compact">
        <div><span>Finanças pessoais</span><h1>Contas a receber</h1><p>Controle de valores previstos, vencidos e recebidos.</p></div>
        <div className="catalog-role">Perfil: <strong>{role}</strong></div>
      </header>

      <div className="kpi-grid">
        <article className="meg-card"><span>Em aberto</span><strong>{brl.format(totals.open)}</strong></article>
        <article className="meg-card"><span>Vencido</span><strong>{brl.format(totals.overdue)}</strong></article>
        <article className="meg-card"><span>Recebido</span><strong>{brl.format(totals.paid)}</strong></article>
      </div>

      <div className="catalog-layout">
        <div>
          <form className="meg-card catalog-form" onSubmit={createCustomer}>
            <span className="meg-eyebrow">Cadastro rápido</span><h3>Novo pagador</h3>
            <label>Nome<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={!canWrite} required /></label>
            <button className="auth-submit" disabled={!canWrite || busy}>Cadastrar</button>
          </form>

          <form className="meg-card catalog-form" onSubmit={createReceivable}>
            <span className="meg-eyebrow">Novo título</span><h3>Conta a receber</h3>
            <label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canWrite} required /></label>
            <label>Pagador<select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!canWrite}><option value="">Não informado</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Valor<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!canWrite} required /></label>
            <label>Vencimento<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canWrite} required /></label>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" disabled={!canWrite || busy}>Salvar conta</button>
          </form>
        </div>

        <div className="meg-card catalog-list">
          <div className="catalog-list-heading"><div><span className="meg-eyebrow">Agenda</span><h3>{items.length} títulos</h3></div><button onClick={() => void load()}>Atualizar</button></div>
          <div className="catalog-table">
            {items.map((item) => {
              const overdue = item.status !== 'paid' && new Date(item.dueDate) < new Date();
              return <article key={item.id}>
                <div><strong>{item.description}</strong><span>{item.customer?.name || 'Sem pagador'} · vence {new Date(item.dueDate).toLocaleDateString('pt-BR')}</span></div>
                <strong>{brl.format(Number(item.openAmount))}</strong>
                <span className={`status-pill ${item.status === 'paid' ? 'active' : ''}`}>{item.status === 'paid' ? 'Recebido' : overdue ? 'Vencido' : item.status === 'partial' ? 'Parcial' : 'Em aberto'}</span>
                {item.status !== 'paid' && canWrite && <button onClick={() => { setReceiving(item); setReceiptAmount(String(item.openAmount)); }}>Receber</button>}
              </article>;
            })}
          </div>
        </div>
      </div>

      {receiving && <div className="modal-backdrop"><form className="modal-card" onSubmit={confirmReceipt}><header><div><span>Baixa de recebimento</span><h2>{receiving.description}</h2></div><button type="button" className="icon-button" onClick={() => setReceiving(null)}>×</button></header><div className="form-grid"><label>Valor<input value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} /></label><label>Conta<select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Não informada</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Forma de recebimento<select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}><option value="">Não informada</option>{methods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><footer><button type="button" onClick={() => setReceiving(null)}>Cancelar</button><button className="auth-submit" disabled={busy}>Confirmar recebimento</button></footer></form></div>}
    </section>
  );
}
