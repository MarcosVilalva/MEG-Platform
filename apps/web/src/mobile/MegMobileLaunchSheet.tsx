import { useEffect, useMemo, useState } from 'react';
import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { MegMobilePicker, type MegMobilePickerOption } from './MegMobilePicker';
import { loadMegMobileHistorySuggestions, type MegMobileHistorySuggestion } from './meg-mobile-description-history';
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
  const [historySuggestions, setHistorySuggestions] = useState<MegMobileHistorySuggestion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('');

  const accounts = useMemo(() => data.accounts.filter((item) => item.isActive), [data.accounts]);
  const methods = useMemo(() => data.paymentMethods.filter((item) => item.isActive), [data.paymentMethods]);
  const categories = useMemo(() => data.categories.filter((item) => item.isActive && (!item.type || item.type === (mode === 'income' ? 'income' : 'expense'))), [data.categories, mode]);
  const accountOptions: MegMobilePickerOption[] = accounts.map((account) => ({
    id: account.id,
    label: account.name,
    subtitle: account.type ? String(account.type) : undefined,
  }));
  const categoryOptions: MegMobilePickerOption[] = categories.map((category) => ({
    id: category.id,
    label: category.name,
    subtitle: category.group || (category.type === 'income' ? 'Receita' : category.type === 'expense' ? 'Despesa' : undefined),
  }));
  const paymentOptions: MegMobilePickerOption[] = methods.map((method) => ({
    id: method.id,
    label: method.name,
    subtitle: method.type ? String(method.type) : undefined,
  }));
  const cardOptions: MegMobilePickerOption[] = data.cards
    .filter((card) => card.isActive !== false)
    .map((card) => ({
      id: card.id,
      label: card.name,
      subtitle: card.lastFour ? `Final ${card.lastFour}` : 'Cartão de crédito',
    }));

  const selectedMethod = methods.find((item) => item.id === paymentMethodId);

  useEffect(() => {
    if (event || mode === 'benefit' || !historyOpen) {
      setHistorySuggestions([]);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setHistoryLoading(true);
      void loadMegMobileHistorySuggestions(mode, description)
        .then((items) => {
          if (!cancelled) setHistorySuggestions(items);
        })
        .catch(() => {
          if (!cancelled) setHistorySuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setHistoryLoading(false);
        });
    }, 70);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [description, event, historyOpen, mode]);

  function useHistorySuggestion(suggestion: MegMobileHistorySuggestion) {
    if (suggestion.type !== mode || event) return;

    setDescription(suggestion.label);
    setHistoryOpen(false);
    setHistorySuggestions([]);

    const filled: string[] = [];
    if (suggestion.categoryId && categories.some((item) => item.id === suggestion.categoryId)) {
      setCategoryId(suggestion.categoryId);
      filled.push('categoria');
    }
    if (suggestion.paymentMethodId && methods.some((item) => item.id === suggestion.paymentMethodId)) {
      setPaymentMethodId(suggestion.paymentMethodId);
      filled.push(mode === 'income' ? 'forma de recebimento' : 'forma de pagamento');
    }
    if (suggestion.accountId && accounts.some((item) => item.id === suggestion.accountId)) {
      setAccountId(suggestion.accountId);
      filled.push('conta');
    }

    setHistoryStatus(
      filled.length
        ? `Histórico aplicado: ${filled.join(' · ')}. Revise antes de salvar.`
        : 'Descrição recuperada do histórico. Revise os demais campos antes de salvar.'
    );
  }
  const creditMethod = methods.find((item) => isCreditMethod(item));
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

  useEffect(() => {
    if (mode !== 'expense') {
      if (!event) setCardId('');
      return;
    }
    if (cardId && !isCreditMethod(selectedMethod) && creditMethod) {
      setPaymentMethodId(creditMethod.id);
    }
  }, [mode, cardId, selectedMethod?.id, creditMethod?.id, event]);

  function validate() {
    if (!description.trim()) return 'Informe a descrição.';
    if (!categoryId) return 'Selecione a categoria.';
    if (!paymentMethodId) return mode === 'income' ? 'Selecione a forma de recebimento.' : 'Selecione a forma de pagamento.';
    if (parseAmount(amount) <= 0) return 'Informe um valor maior que zero.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Informe uma data válida.';
    if (credit) {
      if (!cardId) return 'Selecione o cartão.';
      return '';
    }
    if (!accountId) return 'Selecione a conta.';
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
          <button type="button" className={mode === 'expense' ? 'active expense' : ''} onClick={() => setMode('expense')}>Despesa</button>
          <button type="button" className={mode === 'income' ? 'active income' : ''} onClick={() => setMode('income')}>Receita</button>
          <button type="button" className={mode === 'benefit' ? 'active benefit' : ''} onClick={() => setMode('benefit')}>Alimentação</button>
        </div> : null}

        <div className="meg3-form-grid meg3-form-grid-faithful">
          <div className="wide meg3-smart-description">
            <label className="meg3-text-field">
              <span>Descrição</span>
              <input
                value={description}
                onFocus={() => {
                  if (!event && mode !== 'benefit') setHistoryOpen(true);
                }}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setHistoryStatus('');
                  if (!event && mode !== 'benefit') setHistoryOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setHistoryOpen(false);
                }}
                placeholder="Digite para pesquisar no seu histórico"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={historyOpen && (historyLoading || historySuggestions.length > 0)}
              />
            </label>

            {!event && mode !== 'benefit' && historyOpen ? <div className="meg3-history-suggestions" role="listbox">
              {historyLoading ? <div className="meg3-history-loading">Buscando no seu histórico…</div> : null}
              {!historyLoading ? historySuggestions.map((suggestion) => <button
                type="button"
                role="option"
                key={suggestion.key}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => useHistorySuggestion(suggestion)}
              >
                <span className="meg3-history-icon" aria-hidden="true">↺</span>
                <span className="meg3-history-copy">
                  <strong>{suggestion.label}</strong>
                  <small>{[
                    suggestion.occurrences > 1 ? `Usado ${suggestion.occurrences}x` : 'Usado 1x',
                    suggestion.categoryName || suggestion.categoryGroup || '',
                    suggestion.paymentMethodName || '',
                    suggestion.accountName || '',
                  ].filter(Boolean).join(' · ')}</small>
                </span>
              </button>) : null}
              {!historyLoading && !historySuggestions.length && description.trim() ? <div className="meg3-history-empty">Nenhum lançamento semelhante no histórico.</div> : null}
            </div> : null}

            {historyStatus ? <small className="meg3-history-status">{historyStatus}</small> : null}
          </div>

          <MegMobilePicker
            className="wide"
            label="Categoria"
            value={categoryId}
            options={categoryOptions}
            placeholder="Selecione uma categoria"
            onChange={setCategoryId}
          />

          <MegMobilePicker
            className="wide"
            label={mode === 'income' ? 'Forma de recebimento' : 'Forma de pagamento'}
            value={paymentMethodId}
            options={paymentOptions}
            disabled={mode === 'benefit'}
            lockedText={mode === 'benefit' ? (verocard?.name || 'Verocard') : undefined}
            placeholder="Selecione a forma"
            onChange={setPaymentMethodId}
          />

          <MegMobilePicker
            className="wide"
            label="Conta"
            value={accountId}
            options={accountOptions}
            disabled={mode === 'benefit' || credit}
            lockedText={mode === 'benefit'
              ? (benefitAccount?.name || 'Benefício Alimentação')
              : credit ? 'Definida pela fatura do cartão' : undefined}
            placeholder="Selecione a conta"
            onChange={setAccountId}
          />

          {mode === 'expense' ? <MegMobilePicker
            className="wide"
            label="Cartão"
            value={cardId}
            options={cardOptions}
            placeholder="Não usar cartão"
            onChange={setCardId}
          /> : null}

          <label className={`wide meg3-amount-field ${negative ? 'negative' : ''}`}>
            <span>{negative ? 'Valor negativo / estorno' : 'Valor'}</span>
            <div><b>{negative ? '-R$' : 'R$'}</b><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00"/></div>
          </label>

          <label className="wide meg3-text-field">
            <span>{mode === 'expense' && !credit && status === 'planned' ? 'Vencimento' : 'Data'}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)}/>
          </label>

          {credit ? <>
            <label className="meg3-text-field">
              <span>Parcelas</span>
              <input type="number" min="1" max="48" value={installments} onChange={(event) => setInstallments(Number(event.target.value || 1))}/>
            </label>
            <button className="meg3-installment-preview-trigger" type="button" disabled={!installmentPreview.length} onClick={() => setInstallmentPreviewOpen(true)}>
              <span>Visualizar parcelas</span>
              <small>{installmentPreview.length ? `${installmentPreview.length} parcela(s) calculadas` : 'Informe cartão, data e valor'}</small>
            </button>
          </> : null}

          {mode === 'expense' && !credit ? <button
            type="button"
            role="switch"
            aria-checked={status === 'planned'}
            className={`wide meg3-pending-switch ${status === 'planned' ? 'active' : ''}`}
            onClick={() => setStatus((value) => value === 'planned' ? 'paid' : 'planned')}
          >
            <span><i aria-hidden="true"/><strong>Lançar como pendente</strong></span>
            <small>{status === 'planned' ? 'O valor ficará em Pendentes até a baixa.' : 'O lançamento será considerado realizado.'}</small>
          </button> : null}

          {mode !== 'benefit' && !credit ? <button
            type="button"
            className={`wide meg3-negative-toggle ${negative ? 'active' : ''}`}
            onClick={() => setNegative((value) => !value)}
          >
            <span>{negative ? 'Restaurar valor positivo' : 'Usar valor negativo / estorno'}</span>
            <small>{negative ? 'O lançamento está com sinal invertido.' : 'Use apenas para estorno, reversão ou ajuste.'}</small>
          </button> : null}

          <label className="wide meg3-text-field meg3-notes-field">
            <span>Observações</span>
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional"/>
          </label>
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
