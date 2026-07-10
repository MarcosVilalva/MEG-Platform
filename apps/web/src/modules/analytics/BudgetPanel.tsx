import { FormEvent, useEffect, useState } from 'react';
import { MEGCard } from '@ui';
import { readSession } from '../../app/auth-client';
import { financeClient, type BudgetOverview } from '../../app/finance-client';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function BudgetPanel() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const [budgets, setBudgets] = useState<BudgetOverview[]>([]);
  const [group, setGroup] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canWrite = readSession()?.user.role !== 'VIEWER';

  async function load() {
    setLoading(true);
    setError('');
    try {
      setBudgets(await financeClient.listBudgets(selectedMonth));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'BUDGET_LOAD_ERROR');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [selectedMonth]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!group.trim() || !Number.isFinite(value) || value <= 0) return;
    await financeClient.saveBudget({ month: selectedMonth, group: group.trim(), amount: value });
    setGroup('');
    setAmount('');
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este limite mensal?')) return;
    await financeClient.deleteBudget(id);
    await load();
  }

  return (
    <MEGCard title="Orçamento por grupo" eyebrow="Limites mensais reais">
      {canWrite && (
        <form className="budget-form" onSubmit={submit}>
          <input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="Grupo (ex.: Alimentação)" required />
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Limite mensal" required />
          <button type="submit">Salvar limite</button>
        </form>
      )}
      {error && <div className="auth-error">Não foi possível carregar o orçamento: {error}</div>}
      <div className="budget-list" aria-busy={loading}>
        {loading && <div className="empty-state">Carregando orçamento...</div>}
        {!loading && budgets.map((budget) => (
          <div className={`budget-row ${budget.status}`} key={budget.id}>
            <div>
              <strong>{budget.group}</strong>
              <small>{brl.format(budget.used)} de {brl.format(budget.amount)} • disponível {brl.format(budget.available)}</small>
            </div>
            <div className="budget-track"><i style={{ width: `${Math.min(100, budget.percent)}%` }} /></div>
            <strong>{budget.percent.toFixed(1).replace('.', ',')}%</strong>
            {canWrite && <button className="danger" type="button" onClick={() => void remove(budget.id)}>Excluir</button>}
          </div>
        ))}
        {!loading && !budgets.length && <div className="empty-state">Cadastre seus limites para acompanhar o orçamento.</div>}
      </div>
    </MEGCard>
  );
}