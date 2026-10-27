import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { financeClient, type Account, type Category, type PaymentMethod, type FinancialEvent } from '../../app/finance-client';
import { Icon } from '../components/Icon';
import { LaunchVisualIcon, type LaunchVisualIconName } from './LaunchVisualIcon';
import { LaunchTypePicker } from './LaunchTypePicker';
import {
  basicLaunchInput, eligibleAccount, eligibleCategory, eligiblePaymentMethod,
  autocompleteFromHistory, parsePositiveBRL, formatLaunchDateBR, type BasicLaunchFields, type BasicLaunchType,
} from './new-launch';
import './new-launch.css';
import './launch-type-picker.css';

type Props = { onClose: () => void; onSaved: (event: FinancialEvent) => void; history: FinancialEvent[] };
type Catalog = { accounts: Account[]; categories: Category[]; methods: PaymentMethod[] };
type Stage = 'choose' | 'form';
type FormStep = 'details' | 'accounts' | 'review';
const FORM_STEPS = [
  { id: 'details', title: 'Dados', icon: 'description' },
  { id: 'accounts', title: 'Conta e pagamento', icon: 'payment' },
  { id: 'review', title: 'Revisão', icon: 'summary' },
] as const;
const blankCatalog: Catalog = { accounts: [], categories: [], methods: [] };

// Mapeamento visual, sem interferência na classificação financeira da categoria.
function categoryVisualIcon(name: string): LaunchVisualIconName {
  const label = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/aliment|refeic|comida|mercado/.test(label)) return 'food';
  if (/casa|moradia|habitac/.test(label)) return 'home';
  if (/transport|combust|veiculo/.test(label)) return 'transport';
  if (/saude|farmac|medic/.test(label)) return 'health';
  if (/compra|loja/.test(label)) return 'shopping';
  return 'category';
}
function currentDay() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => parts.find(p => p.type === name)?.value || '';
  return [part('year'), part('month'), part('day')].join('-');
}
const emptyForm = (): BasicLaunchFields => ({
  type: 'expense', description: '', amount: '', day: currentDay(),
  accountId: '', categoryId: '', paymentMethodId: '', notes: '',
});
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function NewLaunchForm({ onClose, onSaved, history }: Props) {
  const [stage, setStage] = useState<Stage>('choose');
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches);
  const [formStep, setFormStep] = useState<FormStep>('details');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const onChange = () => setCompact(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const [fields, setFields] = useState<BasicLaunchFields>(emptyForm);
  const [catalog, setCatalog] = useState<Catalog>(blankCatalog);
  const [fetching, setFetching] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [fetchVersion, setFetchVersion] = useState(0);
  const [error, setError] = useState('');
  const [possibleDuplicate, setPossibleDuplicate] = useState('');
  const [saving, setSaving] = useState(false);
  const attemptId = useRef(crypto.randomUUID());
  const savingLock = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const closeCurrent = useRef(onClose);
  closeCurrent.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingLock.current) {
        event.preventDefault();
        closeCurrent.current();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
      ) || []).filter(node => node.getClientRects().length > 0);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (!dialog.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener('keydown', keyboard);
      previousFocus?.focus();
    };
  }, []);
  useEffect(() => { title.current?.focus(); }, [stage]);

  useEffect(() => {
    if (stage !== 'form') return;
    let active = true;
    setFetching(true);
    setCatalogError('');
    Promise.all([financeClient.listAccounts(), financeClient.listCategories(), financeClient.listPaymentMethods()])
      .then(([accounts, categories, methods]) => {
        if (active) setCatalog({ accounts, categories, methods });
      }).catch(() => {
        if (active) setCatalogError('Os cadastros autorizados não foram carregados. Nada foi enviado.');
      }).finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [stage, fetchVersion]);

  const accounts = useMemo(() => catalog.accounts.filter(eligibleAccount), [catalog.accounts]);
  const categories = useMemo(() => catalog.categories.filter(c => eligibleCategory(c, fields.type)), [catalog.categories, fields.type]);
  const methods = useMemo(() => catalog.methods.filter(eligiblePaymentMethod), [catalog.methods]);
  const completeCatalog = !!(accounts.length && categories.length && methods.length);
  const suggestions = useMemo(
    () => [...new Set(history.filter(x => x.type === fields.type).map(x => x.description))].slice(0, 150),
    [history, fields.type],
  );
  const matchingAccount = accounts.find(x => x.id === fields.accountId);
  const matchingCategory = categories.find(x => x.id === fields.categoryId);
  const matchingMethod = methods.find(x => x.id === fields.paymentMethodId);
  const visibleAmount = parsePositiveBRL(fields.amount);
  const update = (key: keyof BasicLaunchFields, value: string) => {
    if (savingLock.current) return;
    attemptId.current = crypto.randomUUID();
    setError('');
    setPossibleDuplicate('');
    setFields(previous => ({ ...previous, [key]: value }));
  };
  const chooseType = (value: BasicLaunchType) => {
    if (savingLock.current) return;
    attemptId.current = crypto.randomUUID();
    setFields(previous => ({ ...previous, type: value, categoryId: '' }));
    setError('');
    setFormStep('details');
    setStage('form');
  };
  const back = () => { if (!savingLock.current) { setStage('choose'); setFormStep('details'); setError(''); } };
  const previousStep = () => {
    if (savingLock.current) return;
    if (!compact || formStep === 'details') return back();
    setFormStep(formStep === 'review' ? 'accounts' : 'details');
    setError('');
  };
  const nextStep = () => {
    if (savingLock.current) return;
    setError('');
    setFormStep(formStep === 'details' ? 'accounts' : 'review');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingLock.current || fetching || catalogError || !completeCatalog) return;
    try {
      const payload = basicLaunchInput(fields, accounts, categories, methods);
      savingLock.current = true;
      setSaving(true);
      setError('');
      setPossibleDuplicate('');
      const saved = await financeClient.createEvent({ ...payload, operationId: attemptId.current });
      if (!saved?.id) throw new Error('O servidor não confirmou o identificador do lançamento.');
      onSaved(saved);
    } catch (cause) {
      // Erros de formato retornam ao passo editavel. Status financeiro vem da API.
      if (compact && cause instanceof Error && !('status' in cause)) {
        if (!fields.description.trim() || !fields.categoryId || !fields.day
          || parsePositiveBRL(fields.amount) === null) setFormStep('details');
        else if (!fields.accountId || !fields.paymentMethodId) setFormStep('accounts');
      }
      const response = cause as { code?: string; duplicate?: { description?: string }; status?: number };
      if (response.code === 'POSSIBLE_DUPLICATE') {
        setPossibleDuplicate(response.duplicate?.description || 'Lançamento semelhante');
        setError('O servidor identificou possível duplicidade. Confira o histórico antes de prosseguir.');
      } else if (response.code === 'OPERATION_ID_REUSED') {
        setError('Essa tentativa já foi usada com outros dados. Verifique o histórico antes de reenviar.');
      } else if (response.status === 401 || response.status === 403) {
        setError('Sessão expirada ou sem autorização de gravação.');
      } else if (['INVALID_ACCOUNT', 'INVALID_CATEGORY', 'INVALID_PAYMENT_METHOD'].includes(response.code || '')) {
        setError('Um dos cadastros foi alterado ou não pertence ao seu espaço. Recarregue o formulário.');
      } else if (response.code === 'BENEFIT_CONTRACT_REQUIRED') {
        setError('Benefícios exigem o fluxo financeiro específico. Nenhum registro foi criado.');
      } else if (response.status && response.status >= 500) {
        setError('Não foi possível confirmar a gravação. Confira o histórico antes de tentar novamente.');
      } else {
        setError(cause instanceof Error && !/^(HTTP_|TypeError)/.test(cause.message)
          ? cause.message : 'Não foi possível confirmar a gravação. Confira o histórico antes de tentar novamente.');
      }
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  return (
    <div className={'meg-new-launch__overlay' + (stage === 'choose' ? ' is-choice-overlay' : '')}>
      <section ref={dialog} className={'meg-new-launch is-' + stage + (compact ? ' is-compact' : '')}
        data-step={compact && stage === 'form' ? formStep : undefined}
        role="dialog" aria-modal="true" aria-labelledby="meg-new-launch-title">
        <header className="meg-new-launch__header">
          <button type="button" className="meg-new-launch__back-icon" onClick={stage === 'form' ? back : onClose} disabled={saving} aria-label="Voltar">
            <Icon name="chevronLeft" width={25} height={25}/>
          </button>
          {stage === 'form' && <span className="meg-new-launch__header-mark" aria-hidden="true"><LaunchVisualIcon name="summary" width={32} height={32}/></span>}
          <div className="meg-new-launch__headline">
            <h2 id="meg-new-launch-title" tabIndex={-1} ref={title}>Novo lançamento</h2>
            {stage === 'choose'
              ? <p>Escolha o tipo de lançamento e siga com um formulário inteligente para Web.</p>
              : <div className="meg-new-launch__header-inline">
                  <div className={'meg-new-launch__type-pill is-' + fields.type} data-testid="selected-launch-type">
                    <span>
                       <LaunchVisualIcon name={fields.type} width={19} height={19}/>
                       {fields.type === 'income' ? 'Receita' : 'Despesa pendente'}
                     </span>
                    <button type="button" onClick={back} disabled={saving}>Alterar tipo</button>
                  </div>
                  <p>Registre sua movimentação com os dados necessários.</p>
                </div>}
          </div>
          <button type="button" className="meg-new-launch__close" onClick={onClose} disabled={saving} aria-label="Fechar novo lançamento">
            <LaunchVisualIcon name="close" width={23} height={23}/>
          </button>
        </header>

        {stage === 'choose' ? (
          <LaunchTypePicker onChoose={chooseType} onBack={onClose}/>
        ) : (
          <>
            {fetching ? <p className="meg-new-launch__message" role="status">Carregando seus cadastros autorizados...</p> :
            catalogError ? <div className="meg-new-launch__message" role="alert"><p>{catalogError}</p>
              <button type="button" onClick={() => setFetchVersion(n => n + 1)}>Tentar novamente</button>
            </div> :
            <form onSubmit={submit} aria-label="Formulário de novo lançamento" noValidate>
              {compact && <nav className="meg-new-launch__steps" aria-label="Etapas do lançamento">
                {FORM_STEPS.map((step, index) => (
                  <button key={step.id} type="button" disabled={saving}
                    className={'meg-new-launch__step' + (formStep === step.id ? ' is-current' : '')}
                    aria-current={formStep === step.id ? 'step' : undefined}
                    onClick={() => { setFormStep(step.id); setError(''); }}>
                    <LaunchVisualIcon name={step.icon} width={19} height={19}/>
                    <span>{index + 1}. {step.title}</span>
                  </button>
                ))}
              </nav>}
              <div className="meg-new-launch__columns">
                <div className="meg-new-launch__panel meg-new-launch__primary">
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="description" width={19} height={19}/>Descrição *</span>
                    <input required maxLength={300} value={fields.description} list="meg-new-launch-descriptions"
                      onChange={event => {
                        const description = event.target.value;
                        const found = autocompleteFromHistory(description, fields.type, history, accounts, categories, methods);
                        update('description', description);
                        if (found) setFields(previous => ({ ...previous, description, ...found }));
                      }} autoComplete="off" placeholder="Descreva a movimentação" disabled={saving}/>
                    <small className="meg-new-launch__field-counter" aria-label="Caracteres da descrição">{fields.description.length}/300</small>
                    <datalist id="meg-new-launch-descriptions">{suggestions.map(s => <option key={s} value={s}/>)}</datalist>
                  </label>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="category" width={19} height={19}/>Categoria *</span>
                    <select required value={fields.categoryId} onChange={event => update('categoryId', event.target.value)} disabled={saving}>
                      <option value="">Selecione uma categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <div className="meg-new-launch__field-group">
                    <span className="meg-new-launch__group-title">Categorias rápidas</span>
                    <div className="meg-new-launch__chips">
                      {categories.slice(0, 5).map(c => <button key={c.id} type="button" disabled={saving}
                        className={'meg-new-launch__chip is-category' + (fields.categoryId === c.id ? ' is-selected' : '')}
                        aria-pressed={fields.categoryId === c.id} data-icon={categoryVisualIcon(c.name)}
                         onClick={() => update('categoryId', c.id)}>
                         <LaunchVisualIcon name={categoryVisualIcon(c.name)} width={20} height={20}/>
                         <span>{c.name}</span>
                       </button>)}
                    </div>
                  </div>
                  <div className="meg-new-launch__field-group">
                    <span className="meg-new-launch__group-title">Conta monetária *</span>
                    <div className="meg-new-launch__chips meg-new-launch__account-chips" aria-label="Atalhos de conta">
                      {accounts.slice(0, 3).map(a => <button type="button" key={a.id}
                        aria-pressed={fields.accountId === a.id} disabled={saving}
                        className={'meg-new-launch__chip' + (fields.accountId === a.id ? ' is-selected' : '')}
                        onClick={() => update('accountId', a.id)}>
                         <LaunchVisualIcon name="account" width={19} height={19}/>
                         <span>{a.name}</span>
                       </button>)}
                    </div>
                  </div>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="account" width={19} height={19}/>Conta *</span>
                    <select required value={fields.accountId} onChange={event => update('accountId', event.target.value)} disabled={saving}>
                      <option value="">Selecione uma conta</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="payment" width={19} height={19}/>Forma de pagamento *</span>
                    <select required value={fields.paymentMethodId} onChange={event => update('paymentMethodId', event.target.value)} disabled={saving}>
                      <option value="">Selecione a forma de pagamento</option>
                      {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                  <div className="meg-new-launch__chips meg-new-launch__method-chips" aria-label="Atalhos de forma de pagamento">
                    {methods.slice(0, 3).map(m => <button key={m.id} type="button" disabled={saving}
                      aria-pressed={fields.paymentMethodId === m.id}
                      className={'meg-new-launch__chip' + (fields.paymentMethodId === m.id ? ' is-selected' : '')}
                      onClick={() => update('paymentMethodId', m.id)}>
                         <LaunchVisualIcon name="payment" width={19} height={19}/>
                         <span>{m.name}</span>
                       </button>)}
                  </div>
                </div>

                <div className="meg-new-launch__panel meg-new-launch__secondary">
                  <div className="meg-new-launch__date-amount">
                    <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="date" width={19} height={19}/>Data *</span>
                      <input required type="date" value={fields.day} disabled={saving} onChange={event => update('day', event.target.value)}/>
                    </label>
                    <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="amount" width={19} height={19}/>Valor *</span>
                      <input required aria-label="Valor em reais *" inputMode="decimal" value={fields.amount} disabled={saving}
                        placeholder="0,00" onChange={event => update('amount', event.target.value)} />
                    </label>
                  </div>
                  <div className="meg-new-launch__field-group">
                    <span className="meg-new-launch__group-title"><LaunchVisualIcon name="status" width={19} height={19}/>Situação</span>
                    <div className="meg-new-launch__status" role="group" aria-label="Situação do lançamento">
                      <span className="is-active">{fields.type === 'income' ? 'Definida pelo servidor' : 'Pendente'}</span>
                      <span className="is-locked" aria-disabled="true">{fields.type === 'expense' ? 'Paga: não liberada' : 'Status final: servidor'}</span>
                    </div>
                    <p className="meg-new-launch__hint">{fields.type === 'expense'
                      ? 'Sem débito. Pagamento à vista depende da validação segura de saldo.'
                      : 'O servidor aplica o status financeiro da receita após confirmar a gravação.'}</p>
                  </div>
                  <div className="meg-new-launch__locked" aria-label="Parcelamento indisponível">
                    <strong><LaunchVisualIcon name="installments" width={19} height={19}/>Parcelamento no cartão</strong>
                    <small>Indisponível neste formulário. Compras parceladas usam o fluxo próprio de cartões.</small>
                  </div>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><LaunchVisualIcon name="notes" width={19} height={19}/>Observações (opcional)</span>
                    <textarea rows={4} maxLength={1000} value={fields.notes} disabled={saving}
                      onChange={event => update('notes', event.target.value)} placeholder="Informações adicionais..."/>
                    <small className="meg-new-launch__field-counter" aria-label="Caracteres das observações">{fields.notes.length}/1000</small>
                  </label>
                </div>

                <aside className="meg-new-launch__summary" aria-label="Resumo do lançamento">
                  <div className="meg-new-launch__summary-title"><span className="meg-new-launch__summary-mark"><LaunchVisualIcon name="summary" width={24} height={24}/></span>
                    <div><h3>Resumo do lançamento</h3><p>Confira os dados antes de salvar.</p></div></div>
                  <div className="meg-new-launch__summary-amount-row">
                    <div className={'meg-new-launch__amount' + (fields.type === 'expense' ? ' is-expense' : '')} data-testid="new-launch-summary-amount" aria-live="polite">
                      {visibleAmount === null ? 'Valor a informar' : currency.format(visibleAmount)}
                    </div>
                    <span className={'meg-new-launch__summary-type is-' + fields.type}>{fields.type === 'expense' ? 'Despesa pendente' : 'Receita'}</span>
                  </div>
                  <dl>
                    <div><dt><LaunchVisualIcon name="summary" width={16} height={16}/>Tipo</dt><dd>{fields.type === 'income' ? 'Receita' : 'Despesa pendente'}</dd></div>
                    <div><dt><LaunchVisualIcon name="description" width={16} height={16}/>Descrição</dt><dd>{fields.description || 'Não informada'}</dd></div>
                    <div><dt><LaunchVisualIcon name="category" width={16} height={16}/>Categoria</dt><dd>{matchingCategory?.name || 'Não selecionada'}</dd></div>
                    <div><dt><LaunchVisualIcon name="account" width={16} height={16}/>Conta</dt><dd>{matchingAccount?.name || 'Não selecionada'}</dd></div>
                    <div><dt><LaunchVisualIcon name="payment" width={16} height={16}/>Forma de pagamento</dt><dd>{matchingMethod?.name || 'Não selecionada'}</dd></div>
                    <div><dt><LaunchVisualIcon name="date" width={16} height={16}/>Data</dt><dd data-testid="new-launch-summary-date">{formatLaunchDateBR(fields.day)}</dd></div>
                    <div><dt><LaunchVisualIcon name="status" width={16} height={16}/>Situação</dt><dd>{fields.type === 'income' ? 'Determinada pelo servidor' : 'Pendente, sem baixa'}</dd></div>
                  </dl>
                  <div className="meg-new-launch__summary-foot">Prévia das informações digitadas. Nenhuma movimentação é criada antes de salvar.</div>
                </aside>
              </div>
              {!completeCatalog && <p role="status" className="meg-new-launch__notice">Não há contas, categorias ou formas de pagamento elegíveis suficientes para concluir o registro.</p>}
              {error && <div role="alert" className="meg-new-launch__error"><p>{error}</p>
                {possibleDuplicate && <p>Possível duplicidade: {possibleDuplicate}. Nenhuma nova gravação foi confirmada.</p>}</div>}
              <footer className="meg-new-launch__footer">
                <button type="button" onClick={previousStep} disabled={saving}>
                  <Icon name="chevronLeft" width={18}/> Voltar
                </button>
                {compact && formStep !== 'review' ? (
                  <button type="button" className="meg-new-launch__save" onClick={nextStep} disabled={saving || !completeCatalog}>
                    Continuar <LaunchVisualIcon name="arrow" width={21} height={21}/>
                  </button>
                ) : (
                  <button type="submit" className="meg-new-launch__save" disabled={saving || !completeCatalog}>
                    <LaunchVisualIcon name="check" width={22} height={22}/>{saving ? 'Salvando...' : 'Salvar lançamento'}
                  </button>
                )}
              </footer>
            </form>}
          </>
        )}
      </section>
    </div>
  );
}
