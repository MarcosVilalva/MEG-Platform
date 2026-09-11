import { useMemo, useState } from 'react';
import { normalizeEvents } from '@core/finance/events';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Reconciliation() {
  const transactions = useAppStore((state) => state.transactions);
  const [bankBalance, setBankBalance] = useState('');
  const [difference, setDifference] = useState<number | null>(null);
  const calculated = useMemo(() => normalizeEvents(transactions).filter((item) => !/benef|aliment|vero/i.test(`${item.description} ${item.category || ''} ${item.account || ''}`) && (item.type === 'income' || ['paid', 'confirmed', 'reconciled'].includes(item.status))).reduce((sum, item) => sum + item.signedAmount, 0), [transactions]);
  const parseMoney = (value: string) => Number(value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  return <section id="reconcile" className="page meg-screen"><header className="page-head screen-heading"><div><span>CONCILIAÇÃO</span><h1>Saldo calculado × saldo real</h1><p>Divergências permanecem explícitas. Ajustes nunca sobrescrevem lançamentos existentes.</p></div></header><section className="premium-grid2"><article className="meg-panel premium-card"><header><div><span>CONFERÊNCIA</span><h2>Comparar saldos</h2></div></header><div className="form-row"><label className="field"><span>Saldo calculado</span><input value={money.format(calculated)} disabled /></label><label className="field"><span>Saldo real do banco</span><input value={bankBalance} onChange={(event) => setBankBalance(event.target.value)} placeholder="R$ 0,00" inputMode="decimal" /></label></div><button className="btn" type="button" onClick={() => setDifference(parseMoney(bankBalance) - calculated)}>Calcular diferença</button>{difference !== null && <div className={`notice ${Math.abs(difference) < .01 ? 'ok' : 'warn'}`}>{Math.abs(difference) < .01 ? 'Saldos conciliados.' : `Diferença encontrada: ${money.format(difference)}.`}</div>}</article><article className="meg-panel premium-card"><header><div><span>REGRA DO AJUSTE</span><h2>Histórico preservado</h2></div></header><div className="notice">Quando houver diferença, o MEG registra um lançamento pago identificado como <strong>AJUSTE DE CONCILIAÇÃO BANCÁRIA</strong>. Nenhum evento anterior é apagado.</div></article></section></section>;
}
