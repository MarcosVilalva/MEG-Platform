import { useEffect, useMemo, useState } from 'react';
import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { cardDueDateForStatement, cardMonthPlus, cardStatementMonthForPurchase } from '../phoenix/data/card-dates';
import {
  phoenixWriteMessage,
  preparePhoenixBenefitEvent,
  preparePhoenixCardPurchase,
  preparePhoenixSimpleEvent,
  runPhoenixBenefitEventEdit,
  runPhoenixBenefitEventWrite,
  runPhoenixCardPurchaseCancel,
  runPhoenixCardPurchaseEdit,
  runPhoenixCardPurchaseWrite,
  runPhoenixSimpleEventArchive,
  runPhoenixSimpleEventEdit,
  runPhoenixSimpleEventWrite,
  type PhoenixBenefitEventInput,
  type PhoenixCardPurchaseInput,
  type PhoenixSimpleEventInput,
} from '../phoenix/data/phoenix-write-gateway';
import './meg-mobile-launch-sheet.css';

type LaunchPreset = 'expense' | 'income' | 'benefit';
type EventWithPayload = FinancialEvent & { sourcePayload?: unknown };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function parseAmount(value: string) {
  const normalized = value.replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function formatAmount(value: number) {
  return value ? value.toFixed(2).replace('.',',') : '';
}

function normalize(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
}

function isBenefitAccount(account: PhoenixReadModel['accounts'][number]) {
  return normalize(account.type).includes('benefit') || /benef|verocard|alimenta/.test(normalize(account.name));
}

function isVerocard(method: PhoenixReadModel['paymentMethods'][number]) {
  return normalize(method.name).includes('verocard');
}

function isCreditMethod(method: PhoenixReadModel['paymentMethods'][number] | undefined) {
  if (!method) return false;
  return /cartao|credito|credit/.test(normalize(method.name) + ' ' + normalize(method.type));
}

function projectedCardMeta(event: EventWithPayload) {
  const payload = event.sourcePayload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  if (row.cardDomain !== true) return null;
  const cardId = String(row.cardId || '');
  const purchaseId = String(row.purchaseId || '');
  return cardId && purchaseId ? { cardId, purchaseId } : null;
}

function dispatchSnapshot(snapshot: PhoenixReadModel | null | undefined) {
  if (snapshot) {
    window.dispatchEvent(new CustomEvent('meg:phoenix-snapshot-committed', { detail: { snapshot } }));
  } else {
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { source: 'meg-mobile-cleanroom' } }));
  }
}

export function MegMobileLaunchSheet({
  data,
  preset,
  event,
  onClose,
}: {
  data: PhoenixReadModel;
  preset: LaunchPreset;
  event?: FinancialEvent | null;
  onClose: () => void;
}) {
  const cardMeta = event ? projectedCardMeta(event as EventWithPayload) : null;
  const cardPurchase = cardMeta
    ? data.cards.find((card) => card.id === cardMeta.cardId)?.purchases.find((purchase) => purchase.id === cardMeta.purchaseId)
    : null;

  const inferredBenefit = Boolean(event && (
    (event.accountId && data.accounts.some((account) => account.id === event.accountId && isBenefitAccount(account)))
    || /verocard|benef|alimenta/.test(normalize(event.paymentMethod?.name) + ' ' + normalize(event.account?.name))
  ));
  const initialMode: LaunchPreset = event ? (inferredBenefit ? 'benefit' : event.type === 'income' ? 'income' : 'expense') : preset;

  const benefitAccount = data.accounts.find((account) => account.isActive && isBenefitAccount(account));
  const verocard = data.paymentMethods.find((method) => method.isActive && isVerocard(method));

  const [mode, setMode] = useState<LaunchPreset>(initialMode);
  const [description, setDescription] = useState(cardPurchase?.description || event?.description || '');
  const [amount, setAmount] = useState(formatAmount(Number(cardPurchase?.totalAmount ?? Math.abs(Number(event?.amount || event?.signedAmount || 0)))));
  const [negative, setNegative] = useState(Boolean(event && Number(event.signedAmount ?? event.amount ?? 0) < 0));
  const [date, setDate] = useState(String(cardPurchase?.purchaseDate || event?.date || todayIso()).slice(0,10));
  const [accountId, setAccountId] = useState(event?.accountId || (initialMode === 'benefit' ? benefitAccount?.id || '' : ''));
  const [categoryId, setCategoryId] = useState(cardPurchase?.category?.id || event?.categoryId || '');
  const [paymentMethodId, setPaymentMethodId] = useState(event?.paymentMethodId || (initialMode === 'benefit' ? verocard?.id || '' : ''));
  const [status, setStatus] = useState<'planned'|'paid'>(event?.status === 'planned' ? 'planned' : 'paid');
  const [cardId, setCardId] = useState(cardMeta?.cardId || '');
  const [installments, setInstallments] = useState(Math.max(1, Number(cardPurchase?.installments || 1)));
  const [notes, setNotes] = useState(event?.notes || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [installmentPreviewOpen, setInstallmentPreviewOpen] = useState(false);

  const accounts = useMemo(() => data.accounts.filter((item) => item.isActive), [data.accounts]);
  const methods = useMemo(() => data.paymentMethods.filter((item) => item.isActive), [data.paymentMethods]);
  const categories = useMemo(() => data.categories.filter((item) => item.isActive && (!item.type || item.type === (mode === 'income' ? 'income' : 'expense'))), [data.categories, mode]);
  const selectedMethod = methods.find((item) => item.id === paymentMethodId);
  const credit = mode === 'expense' && (Boolean(cardId) || isCreditMethod(selectedMethod) || Boolean(cardMeta));
  const selectedCard = data.cards.find((item) => item.id === cardId);
  const installmentPreview = useMemo(() => {
    if (!credit || !selectedCard || !date || parseAmount(amount) <= 0) return [];
    const count = Math.max(1, Math.min(48, Math.trunc(installments || 1)));
    const cents = Math.round(parseAmount(amount) * 100);
    const baseCents = Math.floor(cents / count);
    const remainder = cents - baseCents * count;
    const firstStatement = cardStatementMonthForPurchase(date, Number(selectedCard.closingDay || 1));
    if (!firstStatement) return [];
    return Array.from({ length: count }, (_, index) => {
      const statementMonth = cardMonthPlus(firstStatement, index);
      const due = cardDueDateForStatement(statementMonth, Number(selectedCard.closingDay || 1), Number(selectedCard.dueDay || 1));
      return {
        number: index + 1,
        amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
        due,
        statementMonth,
      };
    });
  }, [credit, selectedCard, date, amount, installments]);

  useEffect(() => {
    if (mode !== 'benefit') return;
    setAccountId(benefitAccount?.id || '');
    setPaymentMethodId(verocard?.id || '');
    setStatus('paid');
  }, [mode, benefitAccount?.id, verocard?.id]);

  function validate() {
    if (!description.trim()) return 'Informe a descrição.';
    if (parseAmount(amount) <= 0) return 'Informe um valor maior que zero.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Informe uma data válida.';
    if (credit) {
      if (!cardId) return 'Selecione o cartão.';
      if (!categoryId) return 'Selecione a categoria.';
      return '';
    }
    if (!accountId) return 'Selecione a conta.';
    if (!paymentMethodId) return mode === 'income' ? 'Selecione a forma de recebimento.' : 'Selecione a forma de pagamento.';
    if (mode !== 'income' && !categoryId) return 'Selecione a categoria.';
    if (mode === 'benefit' && (!benefitAccount || !verocard)) return 'A conta Benefício e a forma Verocard precisam estar ativas.';
    return '';
  }

  async function save() {
    if (busy) return;
    const error = validate();
    if (error) { setMessage(error); return; }
    setBusy(true);
    setMessage(event ? 'Salvando alterações…' : 'Salvando lançamento…');

    try {
      if (credit) {
        const input: PhoenixCardPurchaseInput = {
          cardId,
          categoryId: categoryId || undefined,
          description: description.trim(),
          totalAmount: parseAmount(amount),
          purchaseDate: date,
          installments: Math.max(1, Math.min(48, Math.trunc(installments || 1))),
        };
        if (event && cardMeta && cardPurchase) {
          const result = await runPhoenixCardPurchaseEdit(cardPurchase.id, input, data.month);
          dispatchSnapshot(result.snapshot);
        } else {
          const result = await runPhoenixCardPurchaseWrite(preparePhoenixCardPurchase(input), data.month);
          dispatchSnapshot(result.status === 'confirmed' ? result.snapshot : null);
        }
        onClose();
        return;
      }

      const simple: PhoenixSimpleEventInput = {
        description: description.trim(),
        type: mode === 'income' ? 'income' : 'expense',
        status: mode === 'benefit' || mode === 'income' ? 'paid' : status,
        date,
        amount: negative && mode !== 'benefit' ? -parseAmount(amount) : parseAmount(amount),
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        paymentMethodId: paymentMethodId || undefined,
        notes: notes.trim() || undefined,
      };

      if (mode === 'benefit') {
        const benefit: PhoenixBenefitEventInput = { ...simple, type: 'expense', status: 'paid' };
        if (event) {
          const result = await runPhoenixBenefitEventEdit(event.id, benefit, data.month, event.updatedAt);
          dispatchSnapshot(result.snapshot);
        } else {
          const result = await runPhoenixBenefitEventWrite(preparePhoenixBenefitEvent(benefit), data.month);
          dispatchSnapshot(result.status === 'confirmed' ? result.snapshot : null);
        }
      } else if (event) {
        const result = await runPhoenixSimpleEventEdit(event.id, simple, data.month, event.updatedAt);
        dispatchSnapshot(result.snapshot);
      } else {
        const result = await runPhoenixSimpleEventWrite(preparePhoenixSimpleEvent(simple), data.month);
        dispatchSnapshot(result.status === 'confirmed' ? result.snapshot : null);
      }
      onClose();
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setMessage(phoenixWriteMessage(code));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!event || busy) return;
    setBusy(true);
    setMessage('Excluindo lançamento…');
    try {
      if (cardMeta && cardPurchase) {
        const result = await runPhoenixCardPurchaseCancel(cardPurchase.id, data.month);
        dispatchSnapshot(result.snapshot);
      } else {
        const result = await runPhoenixSimpleEventArchive(event.id, data.month, event.updatedAt);
        dispatchSnapshot(result.snapshot);
      }
      onClose();
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setMessage(phoenixWriteMessage(code));
      setDeleteConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  const title = event ? 'Editar lançamento' : 'Novo lançamento';

  return <div className="meg3-form-overlay" role="presentation">
    <section className="meg3-form-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <header className="meg3-form-head">
        <div><small>MEG FINANÇAS</small><h2>{title}</h2></div>
        <button type="button" disabled={busy} onClick={onClose}>×</button>
      </header>

      <div className="meg3-form-body" data-meg-scroll-region="true">
        {!event ? <div className="meg3-form-segment">
          <button className={mode === 'expense' ? 'active expense' : ''} onClick={() => setMode('expense')}>Despesa</button>
          <button className={mode === 'income' ? 'active income' : ''} onClick={() => setMode('income')}>Receita</button>
          <button className={mode === 'benefit' ? 'active benefit' : ''} onClick={() => setMode('benefit')}>Alimentação</button>
        </div> : null}

        <section className={`meg3-form-highlight ${negative ? 'negative' : ''}`}>
          <label>
            <span>{negative ? 'Valor negativo / estorno' : 'Valor'}</span>
            <div><b>{negative ? '-R' + '$' : 'R' + '$'}</b><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00"/></div>
          </label>
          {mode !== 'benefit' && !credit ? <button type="button" className={negative ? 'active' : ''} onClick={() => setNegative((value) => !value)}>
            <span>{negative ? 'Restaurar positivo' : 'Usar valor negativo'}</span>
            <small>{negative ? 'O lançamento será salvo como estorno/reversão.' : 'Permite inverter o sinal deste lançamento.'}</small>
          </button> : null}
        </section>

        <div className="meg3-form-grid">
          <label className="wide"><span>Descrição</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado, salário, farmácia"/></label>
          <label><span>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)}/></label>
          {mode === 'expense' && !credit ? <label><span>Situação</span><select value={status} onChange={(e) => setStatus(e.target.value as 'planned'|'paid')}><option value="planned">Pendente</option><option value="paid">Pago</option></select></label> : null}

          {!credit ? <label className={mode === 'benefit' ? 'locked' : ''}><span>Conta</span><select value={accountId} disabled={mode === 'benefit'} onChange={(e) => setAccountId(e.target.value)}><option value="">Selecione</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : null}

          <label><span>Categoria</span><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.group ? category.group + ' · ' : ''}{category.name}</option>)}</select></label>

          {!credit ? <label className={mode === 'benefit' ? 'locked' : ''}><span>{mode === 'income' ? 'Recebimento' : 'Pagamento'}</span><select value={paymentMethodId} disabled={mode === 'benefit'} onChange={(e) => setPaymentMethodId(e.target.value)}><option value="">Selecione</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label> : null}

          {mode === 'expense' && !event && !credit ? <label className="wide meg3-card-route"><span>Compra no cartão</span><select value="" onChange={(e) => { if(e.target.value) setCardId(e.target.value); }}><option value="">Não usar cartão</option>{data.cards.filter((card) => card.isActive !== false).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label> : null}

          {credit ? <>
            <label><span>Cartão</span><select value={cardId} onChange={(e) => setCardId(e.target.value)}><option value="">Selecione</option>{data.cards.filter((card) => card.isActive !== false).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
            <label><span>Parcelas</span><input type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(Number(e.target.value || 1))}/></label>
            <button className="wide meg3-installment-preview-trigger" type="button" disabled={!installmentPreview.length} onClick={() => setInstallmentPreviewOpen(true)}>
              <span>Visualizar parcelas</span>
              <small>{installmentPreview.length ? `${installmentPreview.length} parcela(s) calculadas pelo fechamento e vencimento do cartão.` : 'Selecione cartão, data e valor.'}</small>
            </button>
          </> : null}

          <label className="wide"><span>Observações</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional"/></label>
        </div>

        {message ? <div className="meg3-form-message" role="status">{message}</div> : null}
      </div>

      <footer className="meg3-form-actions">
        {event ? <button type="button" className="danger ghost" disabled={busy} onClick={() => setDeleteConfirm(true)}>Excluir</button> : <button type="button" className="ghost" disabled={busy} onClick={onClose}>Cancelar</button>}
        <button type="button" className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Processando…' : event ? 'Salvar alterações' : 'Salvar lançamento'}</button>
      </footer>

      {installmentPreviewOpen ? <div className="meg3-installment-preview">
        <section role="dialog" aria-modal="true" aria-label="Visualizar parcelas">
          <header><div><small>PARCELAMENTO</small><h3>Visualizar parcelas</h3></div><button type="button" onClick={() => setInstallmentPreviewOpen(false)}>×</button></header>
          <div className="meg3-installment-list" data-meg-scroll-region="true">
            {installmentPreview.map((item) => <article key={item.number}>
              <span><strong>Parcela {item.number}/{installmentPreview.length}</strong><small>Fatura {item.statementMonth.split('-').reverse().join('/')} · vence {item.due.split('-').reverse().join('/')}</small></span>
              <b>{money.format(item.amount)}</b>
            </article>)}
          </div>
          <footer><span><small>Total</small><strong>{money.format(installmentPreview.reduce((sum, item) => sum + item.amount, 0))}</strong></span><button type="button" onClick={() => setInstallmentPreviewOpen(false)}>Fechar</button></footer>
        </section>
      </div> : null}

      {deleteConfirm ? <div className="meg3-delete-confirm">
        <div><small>CONFIRMAR EXCLUSÃO</small><h3>Excluir este lançamento?</h3><p>{description || 'O lançamento selecionado'} não ficará mais ativo no MEG.</p><span><button disabled={busy} onClick={() => setDeleteConfirm(false)}>Cancelar</button><button className="danger" disabled={busy} onClick={() => void remove()}>Excluir</button></span></div>
      </div> : null}
    </section>
  </div>;
}
