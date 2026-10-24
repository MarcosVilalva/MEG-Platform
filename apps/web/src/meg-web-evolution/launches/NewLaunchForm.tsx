import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { financeClient, type Account, type Category, type PaymentMethod, type FinancialEvent } from '../../app/finance-client';
import { basicLaunchInput, eligibleAccount, eligibleCategory, eligiblePaymentMethod, autocompleteFromHistory, type BasicLaunchFields, type BasicLaunchType } from './new-launch';
import './new-launch.css';

type Props = { onClose: () => void; onSaved: (event: FinancialEvent) => void; history: FinancialEvent[] };
type Catalog = { accounts: Account[]; categories: Category[]; methods: PaymentMethod[] };

const emptyCatalog: Catalog = { accounts: [], categories: [], methods: [] };
function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(p => p.type === type)?.value || '';
  return [part('year'), part('month'), part('day')].join('-');
}
function initialFields(): BasicLaunchFields {
  return {
    type: 'expense', description: '', amount: '', day: todayInSaoPaulo(),
    accountId: '', categoryId: '', paymentMethodId: '', notes: '',
  };
}

export function NewLaunchForm({ onClose, onSaved, history }: Props) {
  const [fields, setFields] = useState<BasicLaunchFields>(initialFields);
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [fetching, setFetching] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [retryCatalog, setRetryCatalog] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [suspectedDuplicate, setSuspectedDuplicate] = useState('');
  const attemptId = useRef(crypto.randomUUID());
  const savingLock = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const focusedBefore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingLock.current) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
      ) || []).filter(node => node.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      focusedBefore?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setFetching(true);
    setCatalogError('');
    Promise.all([financeClient.listAccounts(), financeClient.listCategories(), financeClient.listPaymentMethods()])
      .then(([accounts, categories, methods]) => {
        if (alive) setCatalog({ accounts, categories, methods });
      })
      .catch(() => {
        if (alive) setCatalogError('Não foi possível consultar os cadastros autorizados. Nenhum lançamento foi enviado.');
      })
      .finally(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, [retryCatalog]);

  const activeAccounts = useMemo(() => catalog.accounts.filter(eligibleAccount), [catalog]);
  const activeCategories = useMemo(() => catalog.categories.filter(c => eligibleCategory(c, fields.type)), [catalog, fields.type]);
  const activeMethods = useMemo(() => catalog.methods.filter(eligiblePaymentMethod), [catalog]);
  const hasCatalog = activeAccounts.length > 0 && activeCategories.length > 0 && activeMethods.length > 0;
  const suggestions = useMemo(() => Array.from(new Set(history.filter(e => e.type === fields.type).map(e => e.description))), [history, fields.type]);

  const change = (key: keyof BasicLaunchFields, value: string) => {
    if (savingLock.current) return;
    attemptId.current = crypto.randomUUID();
    setError('');
    setSuspectedDuplicate('');
    setFields(previous => ({ ...previous, [key]: value }));
  };
  const changeType = (value: BasicLaunchType) => {
    if (savingLock.current) return;
    attemptId.current = crypto.randomUUID();
    setError('');
    setSuspectedDuplicate('');
    setFields(previous => ({ ...previous, type: value, categoryId: '' }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingLock.current || fetching || catalogError) return;
    try {
      const input = basicLaunchInput(fields, activeAccounts, activeCategories, activeMethods);
      savingLock.current = true;
      setSaving(true);
      setError('');
      setSuspectedDuplicate('');
      const saved = await financeClient.createEvent({ ...input, operationId: attemptId.current });
      if (!saved?.id) throw new Error('Servidor não confirmou a identificação do lançamento.');
      onSaved(saved);
    } catch (cause) {
      const response = cause as { code?: string; duplicate?: { description?: string; amount?: number; date?: string }; status?: number };
      if (response.code === 'POSSIBLE_DUPLICATE') {
        setSuspectedDuplicate(response.duplicate?.description || 'Um registro semelhante');
        setError('Possível duplicidade encontrada no servidor. Confira o histórico antes de tentar outra operação.');
      } else if (response.code === 'OPERATION_ID_REUSED') {
        setError('A tentativa de gravação já existe com outros dados. Feche e reabra o formulário para conferir antes de reenviar.');
      } else if (response.status === 401 || response.status === 403) {
        setError('Sua sessão ou permissão não permite gravar este lançamento.');
      } else if (response.code === 'INVALID_ACCOUNT' || response.code === 'INVALID_CATEGORY' || response.code === 'INVALID_PAYMENT_METHOD') {
        setError('Um dos cadastros foi alterado ou não pertence ao seu espaço. Atualize os cadastros.');
      } else if (response.code === 'BENEFIT_CONTRACT_REQUIRED') {
        setError('Movimentações de benefício exigem o fluxo próprio e não foram gravadas.');
      } else {
        setError(cause instanceof Error && !/^HTTP_|^TypeError/.test(cause.message)
          ? cause.message : 'Não foi possível confirmar a gravação. Confira os lançamentos antes de reenviar.');
      }
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="meg-new-launch__overlay">
      <section className="meg-new-launch" role="dialog" aria-modal="true" aria-labelledby="meg-new-launch-title" ref={dialogRef}>
        <header className="meg-new-launch__header">
          <div>
            <h2 id="meg-new-launch-title" ref={titleRef} tabIndex={-1}>Novo lançamento</h2>
            <p>Primeira etapa operacional: receita realizada ou despesa pendente.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar novo lançamento">Fechar</button>
        </header>

        {fetching ? <p role="status" className="meg-new-launch__message">Consultando contas, categorias e formas de pagamento...</p> :
          catalogError ? <div className="meg-new-launch__message" role="alert">
            <p>{catalogError}</p>
            <button type="button" onClick={() => setRetryCatalog(n => n + 1)}>Tentar novamente</button>
          </div> :
          <form onSubmit={submit} aria-label="Formulário de novo lançamento">
            <fieldset className="meg-new-launch__type" disabled={saving}>
              <legend>Tipo do lançamento</legend>
              <label><input type="radio" name="new-launch-type" checked={fields.type === 'expense'} onChange={() => changeType('expense')} /> Despesa pendente</label>
              <label><input type="radio" name="new-launch-type" checked={fields.type === 'income'} onChange={() => changeType('income')} /> Receita</label>
            </fieldset>

            <p className="meg-new-launch__notice">
              {fields.type === 'expense'
                ? 'Nesta entrega a despesa é registrada como pendente, sem realizar débito. Pagamentos à vista, Fixo e cartão serão liberados somente pelo fluxo financeiro seguro correspondente.'
                : 'A receita será classificada como realizada pelo servidor, conforme a política financeira vigente.'}
            </p>

            <div className="meg-new-launch__fields">
              <label>Descrição *
                <input required maxLength={300} value={fields.description} list="meg-new-launch-descriptions" onChange={e => {
                  const description = e.target.value;
                  const known = autocompleteFromHistory(description, fields.type, history, activeAccounts, activeCategories, activeMethods);
                  change('description', description);
                  if (known) setFields(prev => ({ ...prev, description, ...known }));
                }} autoComplete="off" placeholder="Descreva a movimentação" disabled={saving} />
                <datalist id="meg-new-launch-descriptions">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
              </label>
              <label>Valor em reais *
                <input required inputMode="decimal" value={fields.amount} onChange={e => change('amount', e.target.value)} placeholder="0,00" disabled={saving} />
              </label>
              <label>Data *
                <input required type="date" value={fields.day} onChange={e => change('day', e.target.value)} disabled={saving} />
              </label>
              <label>Categoria *
                <select required value={fields.categoryId} onChange={e => change('categoryId', e.target.value)} disabled={saving}>
                  <option value="">Selecione uma categoria</option>
                  {activeCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label>Conta monetária *
                <select required value={fields.accountId} onChange={e => change('accountId', e.target.value)} disabled={saving}>
                  <option value="">Selecione uma conta</option>
                  {activeAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label>Forma de pagamento *
                <select required value={fields.paymentMethodId} onChange={e => change('paymentMethodId', e.target.value)} disabled={saving}>
                  <option value="">Selecione uma forma</option>
                  {activeMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
                </select>
              </label>
              <label className="meg-new-launch__notes">Observações
                <textarea maxLength={1000} rows={3} value={fields.notes} onChange={e => change('notes', e.target.value)} placeholder="Opcional" disabled={saving} />
              </label>
            </div>

            {!hasCatalog && <p className="meg-new-launch__notice" role="status">
              Não há todos os cadastros elegíveis necessários. É preciso criar ou ativar conta monetária, categoria e forma de pagamento antes de registrar.
            </p>}
            {error && <div className="meg-new-launch__error" role="alert">
              <p>{error}</p>
              {suspectedDuplicate && <p>Registro semelhante: {suspectedDuplicate}. Nenhuma nova gravação foi confirmada.</p>}
            </div>}

            <footer className="meg-new-launch__footer">
              <button type="button" onClick={onClose} disabled={saving}>Voltar</button>
              <button type="submit" className="meg-new-launch__save" disabled={saving || !hasCatalog}>{saving ? 'Salvando...' : 'Salvar lançamento'}</button>
            </footer>
          </form>}
      </section>
    </div>
  );
}
