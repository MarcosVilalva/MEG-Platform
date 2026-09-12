import { useEffect, useMemo, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-launch.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type TxType = 'expense' | 'income' | 'transfer';
type LaunchDraft = {
  type: TxType;
  description: string;
  accountId: string;
  destinationId: string;
  eventDate: string;
  categoryId: string;
  paymentMethodId: string;
  cardId: string;
  installments: number;
  manualDue: boolean;
  firstDue: string;
  recurring: boolean;
  recurrenceFrequency: 'Mensal' | 'Semanal' | 'Anual';
  recurrenceCount: number;
  saveTemplate: boolean;
  templateName: string;
  notes: string;
};

function saoPauloDay() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function initialDraft(): LaunchDraft {
  return {
    type: 'expense', description: '', accountId: '', destinationId: '', eventDate: saoPauloDay(),
    categoryId: '', paymentMethodId: '', cardId: '', installments: 1, manualDue: false,
    firstDue: '', recurring: false, recurrenceFrequency: 'Mensal', recurrenceCount: 12,
    saveTemplate: false, templateName: '', notes: ''
  };
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

function isBenefitAccount(name?: string | null) {
  const value = normalizeText(name || '');
  return value.includes('benef') || value.includes('verocard') || value.includes('alimentacao');
}

function isCreditMethod(name?: string | null, type?: string | null) {
  const value = normalizeText(`${name || ''} ${type || ''}`);
  return value.includes('credito') || value.includes('cartao');
}

function isCrediarioMethod(name?: string | null, type?: string | null) {
  return normalizeText(`${name || ''} ${type || ''}`).includes('crediario');
}

function monthPlus(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function validDayInMonth(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Math.min(day, last);
}

function cardDueDate(purchaseDate: string, closingDay: number, dueDay: number) {
  if (!purchaseDate) return '';
  const purchaseMonth = purchaseDate.slice(0, 7);
  const purchaseDay = Number(purchaseDate.slice(8, 10));
  const statementMonth = monthPlus(purchaseMonth, purchaseDay > closingDay ? 1 : 0);
  const dueMonth = monthPlus(statementMonth, dueDay <= closingDay ? 1 : 0);
  const safeDay = validDayInMonth(dueMonth, dueDay);
  return `${dueMonth}-${String(safeDay).padStart(2, '0')}`;
}

function eventStatus(value: string) {
  return ({ draft: 'Rascunho', planned: 'Pendente', confirmed: 'Confirmado', paid: 'Pago', reconciled: 'Conciliado', archived: 'Arquivado' } as Record<string, string>)[value] || value;
}

function eventType(value: string) {
  return value === 'income' ? 'Receita' : 'Despesa';
}

function amountFromEvent(event: FinancialEvent) {
  return Math.abs(Number(event.amount || 0));
}

function weekday(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)).replace('.', '');
}

function labelForAccount(data: PhoenixReadModel, id: string) {
  return data.accounts.find((item) => item.id === id)?.name || 'Selecione a conta';
}

function formatInputMoney(cents: number, negative: boolean) {
  return money.format((negative ? -1 : 1) * cents / 100);
}

function sourceGroup(event: FinancialEvent) {
  return event.sourceDetails?.group || event.category?.group || '—';
}

function sourceClassification(event: FinancialEvent) {
  return event.sourceDetails?.expenseClass || event.category?.name || '—';
}

export function PhoenixMovementsV15({ data, onNavigateHistory }: { data: PhoenixReadModel; onNavigateHistory?: () => void }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [account, setAccount] = useState('all');
  const [launchOpen, setLaunchOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<FinancialEvent | null>(null);
  const [draft, setDraft] = useState<LaunchDraft>(initialDraft);
  const [amountCents, setAmountCents] = useState(0);
  const [negative, setNegative] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const monthEvents = useMemo(() => data.events.items.filter((event) => event.competence === data.month), [data]);
  const filtered = useMemo(() => monthEvents.filter((event) => {
    const haystack = `${event.description} ${event.category?.name || ''} ${event.category?.group || ''} ${event.account?.name || ''} ${event.paymentMethod?.name || ''}`.toLocaleLowerCase('pt-BR');
    return haystack.includes(search.trim().toLocaleLowerCase('pt-BR'))
      && (typeFilter === 'all' || event.type === typeFilter)
      && (status === 'all' || event.status === status)
      && (account === 'all' || event.accountId === account);
  }), [monthEvents, search, typeFilter, status, account]);

  const income = monthEvents.filter((event) => event.type === 'income').reduce((sum, event) => sum + amountFromEvent(event), 0);
  const expense = monthEvents.filter((event) => event.type === 'expense').reduce((sum, event) => sum + amountFromEvent(event), 0);
  const pending = monthEvents.filter((event) => event.status === 'planned').length;

  const selectedAccount = data.accounts.find((item) => item.id === draft.accountId) || null;
  const selectedDestination = data.accounts.find((item) => item.id === draft.destinationId) || null;
  const selectedCategory = data.categories.find((item) => item.id === draft.categoryId) || null;
  const selectedPayment = data.paymentMethods.find((item) => item.id === draft.paymentMethodId) || null;
  const selectedCard = data.cards.find((item) => item.id === draft.cardId) || null;
  const benefit = isBenefitAccount(selectedAccount?.name);
  const credit = isCreditMethod(selectedPayment?.name, selectedPayment?.type);
  const crediario = isCrediarioMethod(selectedPayment?.name, selectedPayment?.type);
  const calculatedDue = selectedCard ? cardDueDate(draft.eventDate, selectedCard.closingDay, selectedCard.dueDay) : '';

  const visibleCategories = data.categories.filter((item) => item.isActive && (!item.type || item.type === draft.type));
  const paymentMethods = data.paymentMethods.filter((item) => item.isActive);
  const cards = data.cards.filter((item) => item.isActive);
  const accounts = data.accounts.filter((item) => item.isActive);

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!draft.description.trim()) list.push('descrição');
    if (!draft.accountId) list.push(draft.type === 'transfer' ? 'conta de origem' : 'conta');
    if (!draft.eventDate) list.push('data');
    if (!amountCents) list.push('valor');
    if (draft.type === 'transfer') {
      if (!draft.destinationId) list.push('conta de destino');
      else if (draft.destinationId === draft.accountId) list.push('destino diferente da origem');
      if (benefit || isBenefitAccount(selectedDestination?.name)) list.push('contas monetárias válidas');
    } else {
      if (draft.type === 'expense' && !draft.categoryId) list.push('classificação');
      if (!draft.paymentMethodId) list.push(draft.type === 'income' ? 'forma de recebimento' : 'forma de pagamento');
      if (credit && !draft.cardId) list.push('cartão');
    }
    if (draft.recurring && draft.recurrenceCount < 2) list.push('quantidade da recorrência');
    if (draft.saveTemplate && !draft.templateName.trim()) list.push('nome do modelo');
    return list;
  }, [draft, amountCents, benefit, selectedDestination?.name, credit]);

  const duplicate = useMemo(() => {
    if (!draft.description.trim() || !amountCents || !draft.accountId || !draft.eventDate) return null;
    const target = normalizeText(draft.description);
    return data.events.items.find((event) => normalizeText(event.description) === target
      && Math.round(amountFromEvent(event) * 100) === amountCents
      && event.accountId === draft.accountId
      && event.date.slice(0, 10) === draft.eventDate) || null;
  }, [data.events.items, draft.description, draft.accountId, draft.eventDate, amountCents]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (detailEvent) setDetailEvent(null);
      else if (launchOpen) requestCloseLaunch();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  });

  function updateDraft<K extends keyof LaunchDraft>(key: K, value: LaunchDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setReviewed(false);
  }

  function resetLaunch() {
    setDraft(initialDraft());
    setAmountCents(0);
    setNegative(false);
    setDirty(false);
    setReviewed(false);
  }

  function openLaunch(event?: FinancialEvent) {
    if (event) {
      setDraft({
        ...initialDraft(),
        type: event.type,
        description: event.description,
        accountId: event.accountId || '',
        eventDate: event.date.slice(0, 10),
        categoryId: event.categoryId || '',
        paymentMethodId: event.paymentMethodId || '',
        notes: event.notes || ''
      });
      setAmountCents(Math.round(amountFromEvent(event) * 100));
      setNegative(Number(event.amount) < 0 || Number(event.signedAmount) > 0 && event.type === 'expense');
    } else resetLaunch();
    setDetailEvent(null);
    setLaunchOpen(true);
    setDirty(false);
    setReviewed(false);
  }

  function requestCloseLaunch() {
    if (dirty && !window.confirm('Descartar alterações ainda não gravadas neste lançamento?')) return;
    setLaunchOpen(false);
    resetLaunch();
  }

  function onMoneyChange(value: string) {
    const digits = value.replace(/\D/g, '');
    setAmountCents(Math.min(999999999999, Number(digits || 0)));
    setNegative(value.includes('-') ? true : negative);
    setDirty(true);
    setReviewed(false);
  }

  function onMoneyKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === '-') {
      event.preventDefault();
      setNegative((value) => !value);
      setDirty(true);
      setReviewed(false);
    }
  }

  function reviewLaunch() {
    if (missing.length) return;
    setReviewed(true);
  }

  return <section className="px-screen px-movements-v15">
    <header className="px-screen-head">
      <div><span className="px-kicker">Lançamentos</span><h1>Controle financeiro</h1><p>Inclua e consulte eventos mantendo o histórico de auditoria separado do formulário.</p></div>
      <div className="px-launch-head-actions">
        <details className="px-column-chooser"><summary>Colunas</summary><div><span>Dia</span><span>Classificação</span><span>Grupo</span><span>Forma de pagamento</span><span>Modalidade</span></div></details>
        <button className="px-primary-action px-new-event" type="button" onClick={() => openLaunch()}>＋ Novo lançamento</button>
      </div>
    </header>

    <section className="px-screen-kpis">
      <article><span>Receitas</span><strong>{money.format(income)}</strong><small>Movimentação do período</small></article>
      <article><span>Despesas</span><strong>{money.format(expense)}</strong><small>Movimentação do período</small></article>
      <article><span>Pendentes</span><strong>{pending}</strong><small>Aguardando efetivação</small></article>
      <article><span>Aguardando sincronização</span><strong>0</strong><small>Leitura confirmada pelo backend</small></article>
    </section>

    <section className="px-card px-table-card">
      <div className="px-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descrição, grupo ou usuário" /></label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todas as situações</option><option value="planned">Pendente</option><option value="confirmed">Confirmado</option><option value="paid">Pago</option><option value="reconciled">Conciliado</option></select>
        <select value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">Todas as contas</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>

      <div className="px-table-scroll">
        <table className="px-data-table px-v15-launch-table">
          <thead><tr><th>Vencimento</th><th>Data da compra</th><th>Dia</th><th>Tipo</th><th>Descrição</th><th>Receita</th><th>Classificação</th><th>Grupo</th><th>Despesa</th><th>Forma de pagamento</th><th>Situação</th><th>Modalidade</th><th>Detalhes</th></tr></thead>
          <tbody>{filtered.map((event) => {
            const isIncome = event.type === 'income';
            return <tr key={event.id}>
              <td data-label="Vencimento">{date.format(new Date(event.date))}</td>
              <td data-label="Data da compra">{date.format(new Date(event.date))}</td>
              <td data-label="Dia">{event.sourceDetails?.weekday || weekday(event.date)}</td>
              <td data-label="Tipo"><span className={`px-type-flag ${event.type}`}>{isIncome ? 'RECEITA' : 'DESPESA'}</span></td>
              <td data-label="Descrição"><strong>{event.description}</strong></td>
              <td data-label="Receita" className="px-money positive">{isIncome ? money.format(amountFromEvent(event)) : '—'}</td>
              <td data-label="Classificação">{sourceClassification(event)}</td>
              <td data-label="Grupo">{sourceGroup(event)}</td>
              <td data-label="Despesa" className="px-money negative">{!isIncome ? money.format(amountFromEvent(event)) : '—'}</td>
              <td data-label="Forma de pagamento">{event.sourceDetails?.paymentMethod || event.paymentMethod?.name || '—'}</td>
              <td data-label="Situação"><span className={`px-status ${event.status}`}>{event.sourceDetails?.situation || eventStatus(event.status)}</span></td>
              <td data-label="Modalidade">{event.sourceDetails?.modality || '—'}</td>
              <td data-label="Detalhes"><button className="px-detail-btn" type="button" onClick={() => setDetailEvent(event)} aria-label={`Detalhes de ${event.description}`}>↘</button></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length ? <p className="px-empty">Nenhum lançamento corresponde aos filtros do período.</p> : null}
      </div>
    </section>

    <div className="px-rule-strip"><span>✓ Usuário, conta e sincronização permanecem vinculados.</span><span>✓ Benefício não compõe saldo monetário.</span><span>✓ Histórico de auditoria permanece separado.</span></div>

    {launchOpen ? <>
      <button className="px-launch-backdrop" type="button" aria-label="Fechar novo lançamento" onClick={requestCloseLaunch} />
      <aside className="px-launch-drawer" aria-label="Novo lançamento">
        <div className="px-drawer-head"><div><span className="px-kicker">Novo evento</span><h2>Lançamento</h2></div><button className="px-icon-btn" type="button" onClick={requestCloseLaunch}>×</button></div>
        <div className="px-launch-form px-card">
          <div className="px-segment" aria-label="Tipo do lançamento">{(['expense','income','transfer'] as TxType[]).map((item) => <button key={item} type="button" className={draft.type === item ? 'active' : ''} onClick={() => updateDraft('type', item)}>{item === 'expense' ? 'Despesa' : item === 'income' ? 'Receita' : 'Transferência'}</button>)}</div>
          <div className="px-launch-required">Os campos marcados com * são obrigatórios. A Phoenix exibe somente campos compatíveis com o tipo escolhido.</div>

          <label className="px-field px-quick-fill"><span>Usar modelo salvo</span><select disabled><option>Preencher manualmente</option></select><small>Modelos ainda não possuem contrato oficial de leitura; nenhum exemplo fictício foi carregado.</small></label>

          <div className="px-launch-section-label">Dados principais</div>
          <label className="px-field"><span>Descrição *</span><input value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} maxLength={120} autoComplete="off" placeholder="Ex.: supermercado, salário ou transferência" /></label>

          <div className="px-form-row">
            <label className="px-field"><span>{draft.type === 'transfer' ? 'Conta de origem *' : 'Conta financeira *'}</span><select value={draft.accountId} onChange={(event) => updateDraft('accountId', event.target.value)}><option value="">Selecione</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="px-field"><span>Data do evento *</span><input type="date" value={draft.eventDate} onChange={(event) => updateDraft('eventDate', event.target.value)} /></label>
          </div>

          {draft.type === 'transfer' ? <div className="px-transfer-block"><div className="px-transfer-arrow">Conta de origem ↓ Conta de destino</div><label className="px-field"><span>Conta de destino *</span><select value={draft.destinationId} onChange={(event) => updateDraft('destinationId', event.target.value)}><option value="">Selecione uma conta diferente</option>{accounts.filter((item) => item.id !== draft.accountId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div> : null}

          <label className="px-field"><span>Valor total *</span><input className="px-money-mask" inputMode="numeric" value={formatInputMoney(amountCents, negative)} onChange={(event) => onMoneyChange(event.target.value)} onKeyDown={onMoneyKeyDown} /><small>Digite somente os números. Pressione “-” para alternar estorno/reversão.</small></label>
          {negative && amountCents ? <div className="px-notice warn">Valor negativo identificado. A futura gravação deverá preservar o lançamento original como estorno ou evento reverso.</div> : null}

          {draft.type !== 'transfer' ? <>
            <div className="px-launch-section-label">{draft.type === 'income' ? 'Recebimento' : 'Classificação da despesa'}</div>
            <div className="px-form-row">
              <label className="px-field"><span>{draft.type === 'income' ? 'Classificação (opcional)' : 'Classificação *'}</span><select value={draft.categoryId} onChange={(event) => updateDraft('categoryId', event.target.value)}><option value="">{draft.type === 'income' ? 'Sem classificação' : 'Selecione a classificação'}</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="px-field"><span>Grupo</span><input value={selectedCategory?.group || 'Definido pela classificação'} readOnly /></label>
            </div>
            <div className="px-config-note"><span>Classificações e grupos vêm da base central de Cadastros.</span><strong>Base centralizada</strong></div>

            <div className="px-launch-section-label">{draft.type === 'income' ? 'Recebimento' : 'Pagamento e vencimento'}</div>
            <label className="px-field"><span>{draft.type === 'income' ? 'Forma de recebimento *' : 'Forma de pagamento *'}</span><select value={draft.paymentMethodId} onChange={(event) => updateDraft('paymentMethodId', event.target.value)}><option value="">Selecione</option>{paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </> : null}

          {credit ? <div className="px-card-box">
            <label className="px-field"><span>Cartão *</span><select value={draft.cardId} onChange={(event) => updateDraft('cardId', event.target.value)}><option value="">Selecione o cartão cadastrado</option>{cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="px-calculated-due"><span>Vencimento calculado</span><strong>{calculatedDue ? date.format(new Date(`${calculatedDue}T12:00:00Z`)) : 'Definido após selecionar o cartão'}</strong></div>
            <label className="px-switch"><div><strong>Alterar vencimento manualmente</strong><small>Exceção futura deverá ser registrada no histórico.</small></div><input type="checkbox" checked={draft.manualDue} onChange={(event) => updateDraft('manualDue', event.target.checked)} /></label>
            <div className="px-rule-box">No crédito, a API usa data da compra e fechamento para definir a fatura. O vencimento considera os dias de fechamento e vencimento cadastrados no cartão.</div>
          </div> : null}

          {(credit || crediario) ? <div className="px-installment-box"><div className="px-form-row"><label className="px-field"><span>Quantidade de parcelas *</span><input type="number" min={1} max={credit ? 48 : 120} value={draft.installments} onChange={(event) => updateDraft('installments', Math.max(1, Number(event.target.value) || 1))} /></label><label className="px-field"><span>Vencimento da 1ª parcela</span><input type="date" disabled={credit && !draft.manualDue} value={draft.manualDue ? draft.firstDue : calculatedDue} onChange={(event) => updateDraft('firstDue', event.target.value)} /></label></div><div className="px-rule-box">No cartão, a divisão em parcelas seguirá o contrato da API: centavos são distribuídos sem perda e a primeira fatura depende da data de fechamento.</div></div> : null}

          {benefit ? <div className="px-notice ok">{draft.type === 'income' ? 'A recarga aumenta somente o saldo do benefício e não compõe o caixa monetário.' : 'Esta movimentação usa o saldo do benefício e não altera o caixa monetário.'}</div> : null}

          <div className="px-launch-section-label">Repetição e observações</div>
          <label className="px-switch"><div><strong>Lançamento recorrente</strong><small>Simule os próximos eventos conforme a periodicidade.</small></div><input type="checkbox" checked={draft.recurring} onChange={(event) => updateDraft('recurring', event.target.checked)} /></label>
          {draft.recurring ? <div className="px-recurrence-box"><div className="px-form-row"><label className="px-field"><span>Periodicidade *</span><select value={draft.recurrenceFrequency} onChange={(event) => updateDraft('recurrenceFrequency', event.target.value as LaunchDraft['recurrenceFrequency'])}><option>Mensal</option><option>Semanal</option><option>Anual</option></select></label><label className="px-field"><span>Quantidade *</span><input type="number" min={2} max={120} value={draft.recurrenceCount} onChange={(event) => updateDraft('recurrenceCount', Number(event.target.value) || 0)} /></label></div><div className="px-calculated-due"><span>Eventos que seriam criados</span><strong>{draft.recurrenceCount} lançamentos {draft.recurrenceFrequency.toLocaleLowerCase('pt-BR')}</strong></div></div> : null}

          <label className="px-switch"><div><strong>Salvar como modelo</strong><small>Validação visual apenas nesta etapa.</small></div><input type="checkbox" checked={draft.saveTemplate} onChange={(event) => updateDraft('saveTemplate', event.target.checked)} /></label>
          {draft.saveTemplate ? <label className="px-field"><span>Nome do modelo *</span><input maxLength={60} value={draft.templateName} onChange={(event) => updateDraft('templateName', event.target.value)} placeholder="Ex.: Compra mensal" /></label> : null}
          <label className="px-field"><span>Observações opcionais</span><textarea maxLength={500} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Inclua informações úteis para consulta futura" /></label>

          <div className="px-preview-box"><div className="px-launch-section-label">Resumo antes de confirmar</div><div><span>Tipo</span><strong>{draft.type === 'expense' ? 'Despesa' : draft.type === 'income' ? 'Receita' : 'Transferência'}</strong></div><div><span>Escopo</span><strong>{draft.type === 'transfer' && draft.destinationId ? `${labelForAccount(data, draft.accountId)} para ${labelForAccount(data, draft.destinationId)}` : labelForAccount(data, draft.accountId)}</strong></div><div><span>Valor</span><strong>{formatInputMoney(amountCents, negative)}</strong></div><div><span>Situação inicial</span><strong>Gravação ainda bloqueada</strong></div></div>

          <div className={`px-rule-box ${duplicate ? 'duplicate' : ''}`}>{duplicate ? `Possível duplicidade real encontrada: ${duplicate.description}, ${money.format(amountFromEvent(duplicate))}, em ${date.format(new Date(duplicate.date))}.` : 'Proteção contra duplicidade preparada: descrição, valor, conta e data são comparados com os lançamentos carregados.'}</div>
          <div className={`px-notice ${missing.length ? 'warn' : 'ok'}`}>{missing.length ? `Campos pendentes: ${missing.join(', ')}.` : 'Campos principais preenchidos. Revise o resumo antes de confirmar.'}</div>
          {reviewed ? <div className="px-notice ok"><strong>Paridade do formulário validada.</strong> Nenhum dado foi gravado. A escrita só será ligada depois da auditoria dos contratos.</div> : null}
          <button className="px-primary-action px-review-launch" type="button" disabled={missing.length > 0} onClick={reviewLaunch}>{missing.length ? 'Revisar campos obrigatórios' : 'Revisar lançamento · sem gravar'}</button>
        </div>
      </aside>
    </> : null}

    {detailEvent ? <aside className="px-detail-drawer open" aria-label="Detalhes do lançamento">
      <div className="px-drawer-head"><div><span className="px-kicker">Lançamento</span><h2>Detalhes</h2></div><button className="px-icon-btn" type="button" onClick={() => setDetailEvent(null)}>×</button></div>
      <p className="px-detail-description">{detailEvent.description}</p>
      <div className="px-detail-grid"><div><span>Data</span><strong>{date.format(new Date(detailEvent.date))}</strong></div><div><span>Situação</span><strong>{eventStatus(detailEvent.status)}</strong></div><div><span>Conta</span><strong>{detailEvent.account?.name || 'Não informada'}</strong></div><div><span>Sincronização</span><strong>Confirmada na leitura atual</strong></div><div><span>Tipo</span><strong>{eventType(detailEvent.type)}</strong></div><div><span>Valor</span><strong>{money.format(amountFromEvent(detailEvent))}</strong></div><div><span>Classificação</span><strong>{sourceClassification(detailEvent)}</strong></div><div><span>Grupo</span><strong>{sourceGroup(detailEvent)}</strong></div><div><span>Forma</span><strong>{detailEvent.paymentMethod?.name || detailEvent.sourceDetails?.paymentMethod || '—'}</strong></div><div><span>Modalidade</span><strong>{detailEvent.sourceDetails?.modality || '—'}</strong></div></div>
      {detailEvent.notes ? <div className="px-notice">{detailEvent.notes}</div> : null}
      <div className="px-notice">A edição permanece em simulação. Quando a escrita for habilitada, qualquer alteração deverá preservar rastreabilidade e histórico.</div>
      <div className="px-detail-actions"><button className="px-primary-action" type="button" onClick={() => openLaunch(detailEvent)}>Preparar edição</button><button className="px-secondary-action" type="button" onClick={() => { setDetailEvent(null); onNavigateHistory?.(); }}>Ver histórico</button></div>
    </aside> : null}
  </section>;
}
