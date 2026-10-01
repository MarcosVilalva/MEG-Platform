import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { financeClient, type BudgetOverview } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import { loadPhoenixReadModel } from '../data/load-phoenix-read-model';
import { megAlert, megConfirm } from '../meg-confirm';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type BudgetEditor = {
  mode: 'create' | 'edit';
  id?: string;
  group: string;
  amount: string;
};

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function inputAmount(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmount(value: string) {
  let normalized = value.replace(/R\$/gi, '').replace(/\s/g, '');
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

function budgetError(error: unknown) {
  const code = error instanceof Error ? error.message : 'BUDGET_WRITE_FAILED';
  if (/403|FORBIDDEN/i.test(code)) return 'Seu perfil não possui permissão para alterar orçamentos.';
  if (/BUDGET_NOT_FOUND|404/i.test(code)) return 'Este orçamento não existe mais na base oficial.';
  if (/VALIDATION|400|INVALID/i.test(code)) return 'Revise o grupo e informe um valor maior que zero.';
  return 'Não foi possível concluir a alteração do orçamento.';
}

async function officialBudgetSnapshot(data: PhoenixReadModel) {
  const [snapshot, budgets] = await Promise.all([
    loadPhoenixReadModel(data.month, { force: true }),
    financeClient.listBudgets(data.month),
  ]);
  return { ...snapshot, budgets };
}

export function PhoenixBudgetsGrid({
  data,
  onDataCommitted,
  focusRequest,
}: {
  data: PhoenixReadModel;
  onDataCommitted: (snapshot: PhoenixReadModel) => void;
  focusRequest?: { token: number; budgetId: string } | null;
}) {
  const [editor, setEditor] = useState<BudgetEditor | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [focusedBudgetId, setFocusedBudgetId] = useState<string | null>(null);
  const focusRequestTokenRef = useRef(0);
  const canWrite = ['ADMIN', 'MANAGER', 'OPERATOR'].includes(String(data.user.role));
  const budgets = [...data.budgets].sort((left, right) => left.group.localeCompare(right.group, 'pt-BR', { sensitivity: 'base' }));

  const total = budgets.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const used = budgets.reduce((sum, item) => sum + Number(item.used || 0), 0);
  const available = total - used;
  const danger = budgets.filter((item) => item.status === 'danger').length;

  useEffect(() => {
    if (!focusRequest || focusRequest.token === focusRequestTokenRef.current) return;
    const target = budgets.find((item) => item.id === focusRequest.budgetId);
    if (!target) return;
    focusRequestTokenRef.current = focusRequest.token;
    setFocusedBudgetId(target.id);
    const scrollTimer = window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-budget-id="${CSS.escape(target.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    const clearTimer = window.setTimeout(() => {
      setFocusedBudgetId((current) => current === target.id ? null : current);
    }, 3600);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [budgets, focusRequest]);

  function openNew() {
    setMessage('');
    setFormError('');
    setEditor({ mode: 'create', group: '', amount: '' });
  }

  function openEdit(item: BudgetOverview) {
    setMessage('');
    setFormError('');
    setEditor({ mode: 'edit', id: item.id, group: item.group, amount: inputAmount(item.amount) });
  }

  async function saveEditor() {
    if (!editor || busy || !canWrite) return;
    const group = editor.group.trim();
    const amount = parseAmount(editor.amount);
    if (group.length < 2) {
      setFormError('Informe um grupo com pelo menos 2 caracteres.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Informe um valor de orçamento maior que zero.');
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      await financeClient.saveBudget({ month: data.month, group, amount });
      const snapshot = await officialBudgetSnapshot(data);
      onDataCommitted(snapshot);
      setEditor(null);
      setMessage(editor.mode === 'edit' ? 'Orçamento atualizado na base oficial.' : 'Orçamento criado na base oficial.');
    } catch (error) {
      setFormError(budgetError(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeBudget(item: BudgetOverview) {
    if (busy || !canWrite) return;
    const confirmed = await megConfirm({
      kicker: 'Orçamentos e metas',
      title: 'Excluir este orçamento?',
      message: `${item.group} deixará de ter um limite planejado em ${monthLabel(data.month)}. Os lançamentos financeiros não serão apagados.`,
      confirmLabel: 'Excluir orçamento',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await financeClient.deleteBudget(item.id);
      const snapshot = await officialBudgetSnapshot(data);
      onDataCommitted(snapshot);
      if (editor?.id === item.id) setEditor(null);
      setMessage('Orçamento excluído. Os lançamentos e o realizado foram preservados.');
    } catch (error) {
      await megAlert({
        kicker: 'Orçamentos e metas',
        title: 'Não foi possível excluir',
        message: budgetError(error),
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const editorLayer = editor && typeof document !== 'undefined'
    ? createPortal(
      <div className="meg-web-budget-overlay" role="presentation">
        <button className="meg-web-budget-backdrop" type="button" aria-label="Fechar editor de orçamento" disabled={busy} onClick={() => setEditor(null)} />
        <section className="meg-web-budget-dialog" role="dialog" aria-modal="true" aria-labelledby="meg-budget-dialog-title">
          <header>
            <div>
              <span className="px-kicker">Orçamentos e metas</span>
              <h2 id="meg-budget-dialog-title">{editor.mode === 'edit' ? 'Editar orçamento' : 'Novo orçamento'}</h2>
              <p>{monthLabel(data.month)} · limite planejado por grupo</p>
            </div>
            <button type="button" aria-label="Fechar" disabled={busy} onClick={() => setEditor(null)}>×</button>
          </header>
          <div className="meg-web-budget-form">
            <label>
              <span>Grupo</span>
              <input
                value={editor.group}
                readOnly={editor.mode === 'edit'}
                placeholder="Ex.: Alimentação"
                maxLength={120}
                onChange={(event) => setEditor((current) => current ? { ...current, group: event.target.value } : current)}
              />
              <small>{editor.mode === 'edit' ? 'O grupo fica fixo na edição para preservar a chave mês + grupo.' : 'Se o grupo já existir neste mês, o valor oficial será atualizado.'}</small>
            </label>
            <label>
              <span>Valor planejado</span>
              <input
                value={editor.amount}
                inputMode="decimal"
                placeholder="0,00"
                onChange={(event) => setEditor((current) => current ? { ...current, amount: event.target.value } : current)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void saveEditor();
                  }
                }}
              />
              <small>Informe o teto financeiro do grupo para o período.</small>
            </label>
            {formError ? <div className="meg-web-budget-form-error" role="alert">{formError}</div> : null}
          </div>
          <footer>
            <button type="button" disabled={busy} onClick={() => setEditor(null)}>Cancelar</button>
            <button className="px-primary-action" type="button" disabled={busy || !canWrite} onClick={() => void saveEditor()}>
              {busy ? 'Salvando…' : editor.mode === 'edit' ? 'Salvar alterações' : 'Criar orçamento'}
            </button>
          </footer>
        </section>
      </div>,
      document.body,
    )
    : null;

  return <section className="px-screen meg-web-budget-screen">
    <header className="px-screen-head meg-web-budget-head">
      <div>
        <span className="px-kicker">Orçamentos e metas</span>
        <h1>Planejamento financeiro</h1>
        <p>Defina limites por grupo, acompanhe o realizado e ajuste o planejamento sem alterar nenhum lançamento financeiro.</p>
      </div>
      <div className="px-screen-head-aside meg-web-budget-head-actions">
        <span className="px-total-pill">{monthLabel(data.month)}</span>
        <button className="px-primary-action" type="button" disabled={!canWrite || busy} onClick={openNew}>＋ Novo orçamento</button>
      </div>
    </header>

    {message ? <div className="meg-web-budget-message" role="status">{message}</div> : null}
    {!canWrite ? <div className="meg-web-budget-message is-warning">Seu perfil pode consultar o planejamento, mas não alterar limites.</div> : null}

    <section className="px-screen-kpis">
      <article><span>Orçado</span><strong>{money.format(total)}</strong><small>{budgets.length} grupo(s)</small></article>
      <article><span>Utilizado</span><strong>{money.format(used)}</strong><small>{total ? `${(used / total * 100).toFixed(1)}% do orçamento` : 'Sem orçamento'}</small></article>
      <article className={available < 0 ? 'danger' : ''}><span>Disponível</span><strong>{money.format(available)}</strong><small>Saldo planejado</small></article>
      <article className={danger ? 'danger' : ''}><span>Acima do limite</span><strong>{danger}</strong><small>Grupo(s) em alerta</small></article>
    </section>

    <section className="px-budget-grid meg-web-budget-grid">
      {budgets.map((item) => <article data-budget-id={item.id} className={`px-card px-budget-card meg-web-budget-card ${focusedBudgetId === item.id ? 'is-search-focused' : ''}`} key={item.id}>
        <div className="px-panel-head">
          <div><span>Grupo</span><h2>{item.group}</h2></div>
          <span className={`px-status ${item.status}`}>{item.percent.toFixed(0)}%</span>
        </div>
        <div className="px-progress"><span style={{ '--px-progress': `${Math.min(100, Math.max(0, item.percent))}%` } as CSSProperties} /></div>
        <dl>
          <div><dt>Orçado</dt><dd>{money.format(item.amount)}</dd></div>
          <div><dt>Utilizado</dt><dd>{money.format(item.used)}</dd></div>
          <div><dt>Disponível</dt><dd className={item.available < 0 ? 'negative' : ''}>{money.format(item.available)}</dd></div>
        </dl>
        <div className="meg-web-budget-card-actions">
          <button type="button" disabled={!canWrite || busy} onClick={() => openEdit(item)}>Editar orçamento</button>
          <button className="danger" type="button" disabled={!canWrite || busy} onClick={() => void removeBudget(item)}>Excluir</button>
        </div>
      </article>)}
      {!budgets.length ? <div className="px-card px-empty meg-web-budget-empty">
        <strong>Nenhum orçamento cadastrado para {monthLabel(data.month)}.</strong>
        <span>Crie limites por grupo para transformar o realizado do período em acompanhamento de meta.</span>
        {canWrite ? <button className="px-primary-action" type="button" onClick={openNew}>Criar primeiro orçamento</button> : null}
      </div> : null}
    </section>
    {editorLayer}
  </section>;
}
