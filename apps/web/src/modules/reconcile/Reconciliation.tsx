import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents } from '@core/finance/events';
import { readSession } from '../../app/auth-client';
import { patchCloudTransactions, readCloudState } from '../../app/app-state-client';
import { invalidateFinanceSummary } from '../../app/use-finance-summary';
import { dateInSaoPaulo } from '../../app/calendar';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const isBenefit = (item: { description?: string; category?: string; account?: string; group?: string; paymentMethod?: string }) =>
  /benef|aliment|vero/i.test(`${item.description || ''} ${item.category || ''} ${item.account || ''} ${item.group || ''} ${item.paymentMethod || ''}`);

export function Reconciliation() {
  const transactions = useAppStore((state) => state.transactions);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [bankBalance, setBankBalance] = useState('');
  const [difference, setDifference] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const role = readSession()?.user.role ?? 'VIEWER';
  const canWrite = role !== 'VIEWER';

  const events = useMemo(() => normalizeEvents(transactions).filter((item) => !isBenefit(item)), [transactions]);
  const accounts = useMemo(() => [...new Set(events.map((item) => String(item.account || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [events]);

  useEffect(() => {
    if (!selectedAccount && accounts.length) setSelectedAccount(accounts[0]);
    if (selectedAccount && !accounts.includes(selectedAccount)) setSelectedAccount(accounts[0] || '');
  }, [accounts, selectedAccount]);

  const calculated = useMemo(() => events
    .filter((item) => (!selectedAccount || item.account === selectedAccount) && (item.type === 'income' || ['paid', 'confirmed', 'reconciled'].includes(item.status)))
    .reduce((sum, item) => sum + item.signedAmount, 0), [events, selectedAccount]);

  const parseMoney = (value: string) => Number(value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  const parsedBankBalance = parseMoney(bankBalance);
  const currentDifference = bankBalance.trim() ? parsedBankBalance - calculated : null;
  const effectiveDifference = difference ?? currentDifference;
  const isBalanced = effectiveDifference !== null && Math.abs(effectiveDifference) < 0.01;

  function calculateDifference() {
    setError('');
    setMessage('');
    if (!selectedAccount) {
      setError('Selecione a conta que será conciliada.');
      return;
    }
    if (!bankBalance.trim()) {
      setError('Informe o saldo real apresentado pelo banco.');
      return;
    }
    setDifference(parsedBankBalance - calculated);
  }

  async function createAdjustment() {
    if (!canWrite || !selectedAccount || effectiveDifference === null || Math.abs(effectiveDifference) < 0.01) return;
    const adjustment = effectiveDifference;
    const type = adjustment > 0 ? 'income' : 'expense';
    const value = Math.abs(adjustment);
    const date = dateInSaoPaulo();

    if (!confirm(`Registrar ajuste de conciliação de ${money.format(value)} na conta “${selectedAccount}”? O lançamento anterior será preservado.`)) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await patchCloudTransactions([{
        id: crypto.randomUUID(),
        type,
        launchType: type === 'income' ? 'RECEITA' : 'DESPESA',
        date,
        dueDate: date,
        purchaseDate: date,
        description: 'AJUSTE DE CONCILIAÇÃO BANCÁRIA',
        amount: value,
        incomeAmount: type === 'income' ? value : 0,
        expenseAmount: type === 'expense' ? value : 0,
        status: 'paid',
        situation: type === 'income' ? 'RECEBIDO' : 'PAGO',
        account: selectedAccount,
        category: 'Ajuste de conciliação',
        group: 'Conciliação bancária',
        classification: 'Conciliação bancária',
        paymentMethod: 'Ajuste de conciliação',
        modality: 'Ajuste',
        notes: `Saldo calculado: ${money.format(calculated)} · Saldo bancário informado: ${money.format(parsedBankBalance)}`,
      }]);

      const fresh = await readCloudState();
      replaceTransactions(fresh.state.transactions);
      invalidateFinanceSummary();
      setDifference(0);
      setMessage('Ajuste registrado e confirmado na base compartilhada. O histórico anterior foi preservado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A base não confirmou o ajuste. Nenhum lançamento foi alterado.');
    } finally {
      setBusy(false);
    }
  }

  return <section id="reconcile" className="page meg-screen">
    <header className="page-head screen-heading">
      <div>
        <span>CONCILIAÇÃO</span>
        <h1>Saldo calculado × saldo real</h1>
        <p>Compare uma conta por vez. Divergências permanecem explícitas e qualquer ajuste entra como novo lançamento, sem sobrescrever o histórico.</p>
      </div>
    </header>

    {error && <div className="notice danger">{error}</div>}
    {message && <div className="notice ok">{message}</div>}

    <section className="premium-grid2">
      <article className="meg-panel premium-card">
        <header><div><span>CONFERÊNCIA</span><h2>Comparar saldos da conta</h2></div></header>

        <label className="field">
          <span>Conta conciliada</span>
          <select value={selectedAccount} onChange={(event) => { setSelectedAccount(event.target.value); setDifference(null); setMessage(''); setError(''); }}>
            {!accounts.length && <option value="">Nenhuma conta monetária encontrada</option>}
            {accounts.map((account) => <option key={account} value={account}>{account}</option>)}
          </select>
        </label>

        <div className="form-row">
          <label className="field"><span>Saldo calculado</span><input value={money.format(calculated)} disabled /></label>
          <label className="field"><span>Saldo real do banco</span><input value={bankBalance} onChange={(event) => { setBankBalance(event.target.value); setDifference(null); }} placeholder="R$ 0,00" inputMode="decimal" /></label>
        </div>

        <div className="settings-actions">
          <button className="btn" type="button" onClick={calculateDifference}>Calcular diferença</button>
          {difference !== null && !isBalanced && canWrite && <button className="btn" type="button" disabled={busy} onClick={() => void createAdjustment()}>{busy ? 'Confirmando...' : 'Registrar ajuste'}</button>}
        </div>

        {difference !== null && <div className={`notice ${isBalanced ? 'ok' : 'warn'}`}>
          {isBalanced ? 'Saldos conciliados.' : `Diferença encontrada: ${money.format(difference)}.`}
        </div>}
        {!canWrite && difference !== null && !isBalanced && <div className="notice">Seu perfil permite conferir a conciliação, mas não registrar ajustes.</div>}
      </article>

      <article className="meg-panel premium-card">
        <header><div><span>REGRA DO AJUSTE</span><h2>Histórico preservado</h2></div></header>
        <div className="notice">Quando houver diferença, o MEG cria um novo lançamento pago identificado como <strong>AJUSTE DE CONCILIAÇÃO BANCÁRIA</strong> na conta selecionada. Nenhum evento anterior é apagado ou reescrito.</div>
        <div className="compact-list">
          <div><strong>Diferença positiva</strong><span>Entrada de ajuste</span></div>
          <div><strong>Diferença negativa</strong><span>Saída de ajuste</span></div>
          <div><strong>Confirmação</strong><span>Servidor relido após a gravação</span></div>
        </div>
      </article>
    </section>
  </section>;
}
