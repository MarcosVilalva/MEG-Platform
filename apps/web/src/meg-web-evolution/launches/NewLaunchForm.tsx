import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { financeClient, type Account, type Category, type PaymentMethod, type FinancialEvent } from '../../app/finance-client';
import { Icon } from '../components/Icon';
import {
  basicLaunchInput, eligibleAccount, eligibleCategory, eligiblePaymentMethod,
  autocompleteFromHistory, parsePositiveBRL, formatLaunchDateBR, type BasicLaunchFields, type BasicLaunchType,
} from './new-launch';
import './new-launch.css';

type Props = { onClose: () => void; onSaved: (event: FinancialEvent) => void; history: FinancialEvent[] };
type Catalog = { accounts: Account[]; categories: Category[]; methods: PaymentMethod[] };
type Stage = 'choose' | 'form';
const blankCatalog: Catalog = { accounts: [], categories: [], methods: [] };
const types = [
  { id: 'expense', title: 'Despesa', subtitle: 'Saídas, compras e gastos', icon: 'card', detail: 'Despesa pendente', available: true },
  { id: 'income', title: 'Receita', subtitle: 'Entradas e recebimentos', icon: 'chart', detail: 'Recebimento', available: true },
  { id: 'transfer', title: 'Transferência', subtitle: 'Movimentação entre contas', icon: 'chevronsRight', detail: 'Exige fluxo de duas contas', available: false },
  { id: 'benefit', title: 'Benefício', subtitle: 'Saldo e recarga de alimentação', icon: 'gift', detail: 'Exige contrato próprio', available: false },
] as const;
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
    setStage('form');
  };
  const back = () => { if (!savingLock.current) { setStage('choose'); setError(''); } };

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
    <div className="meg-new-launch__overlay">
      <section ref={dialog} className={'meg-new-launch is-' + stage} role="dialog" aria-modal="true" aria-labelledby="meg-new-launch-title">
        <header className="meg-new-launch__header">
          <button type="button" className="meg-new-launch__back-icon" onClick={stage === 'form' ? back : onClose} disabled={saving} aria-label="Voltar">
            <Icon name="chevronLeft" width={22} height={22}/>
          </button>
          <div className="meg-new-launch__headline">
            <h2 id="meg-new-launch-title" tabIndex={-1} ref={title}>Novo lançamento</h2>
            <p>{stage === 'choose' ? 'Escolha o tipo de movimentação' : fields.type === 'income' ? 'Receita' : 'Despesa pendente'}</p>
          </div>
          <button type="button" className="meg-new-launch__close" onClick={onClose} disabled={saving} aria-label="Fechar novo lançamento">Fechar <span aria-hidden="true">×</span></button>
        </header>

        {stage === 'choose' ? (
          <div className="meg-new-launch__choose" data-testid="new-launch-types">
            <div className="meg-new-launch__intro">
              <span className="meg-new-launch__eyebrow">NOVO LANÇAMENTO</span>
              <h3>Mais controle para o seu dia a dia</h3>
              <p>Escolha o tipo de lançamento e preencha as informações no formulário Web. Todas as operações seguem as regras financeiras do MEG.</p>
              <div className="meg-new-launch__intro-art" aria-hidden="true"><span/><span/><span/><span/><span/><span/></div>
            </div>
            <div className="meg-new-launch__options" aria-label="Tipos de lançamento">
              {types.map(option => {
                const disabled = !option.available;
                return (
                  <button key={option.id} type="button" disabled={disabled}
                    aria-label={disabled ? option.title + ' indisponível' : 'Escolher ' + option.title}
                    className={'meg-new-launch__option is-' + option.id}
                    onClick={() => { if (option.id === 'income' || option.id === 'expense') chooseType(option.id); }}
                  >
                    <span className="meg-new-launch__option-icon" aria-hidden="true"><Icon name={option.icon} width={34} height={34} /></span>
                    <span className="meg-new-launch__option-copy"><strong>{option.title}</strong><small>{option.subtitle}</small><em>{disabled ? 'Em preparação: ' + option.detail : option.detail}</em></span>
                    <span className="meg-new-launch__option-arrow" aria-hidden="true">{disabled ? '•' : <Icon name="chevronRight" width={20} height={20}/>}</span>
                  </button>
                );
              })}
            </div>
            <div className="meg-new-launch__choice-foot" aria-label="Características do formulário">
              <span><Icon name="panelLeftOpen" width={21}/><strong>Layout adaptativo</strong><small>Organização em qualquer tela</small></span>
              <span><Icon name="list" width={21}/><strong>Leitura clara</strong><small>Dados e rótulos identificados</small></span>
              <span><Icon name="card" width={21}/><strong>Regras preservadas</strong><small>Autoridade financeira central</small></span>
              <span><Icon name="chevronRight" width={21}/><strong>Escolha um tipo</strong><small>Para continuar com segurança</small></span>
            </div>
          </div>
        ) : (
          <>
            {fetching ? <p className="meg-new-launch__message" role="status">Carregando seus cadastros autorizados...</p> :
            catalogError ? <div className="meg-new-launch__message" role="alert"><p>{catalogError}</p>
              <button type="button" onClick={() => setFetchVersion(n => n + 1)}>Tentar novamente</button>
            </div> :
            <form onSubmit={submit} aria-label="Formulário de novo lançamento" noValidate={false}>
              <div className="meg-new-launch__form-lead"><Icon name="list" width={21}/> Dados do lançamento</div>
              <div className={'meg-new-launch__type-pill is-' + fields.type} data-testid="selected-launch-type">
                <span>{fields.type === 'income' ? '↑ Receita' : '↓ Despesa pendente'}</span>
                <button type="button" onClick={back} disabled={saving}>Alterar tipo</button>
              </div>
              <div className="meg-new-launch__columns">
                <div className="meg-new-launch__panel meg-new-launch__primary">
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="list" width={18}/>Descrição *</span>
                    <input required maxLength={300} value={fields.description} list="meg-new-launch-descriptions"
                      onChange={event => {
                        const description = event.target.value;
                        const found = autocompleteFromHistory(description, fields.type, history, accounts, categories, methods);
                        update('description', description);
                        if (found) setFields(previous => ({ ...previous, description, ...found }));
                      }} autoComplete="off" placeholder="Descreva a movimentação" disabled={saving}/>
                    <datalist id="meg-new-launch-descriptions">{suggestions.map(s => <option key={s} value={s}/>)}</datalist>
                  </label>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="list" width={18}/>Categoria *</span>
                    <select required value={fields.categoryId} onChange={event => update('categoryId', event.target.value)} disabled={saving}>
                      <option value="">Selecione uma categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <div className="meg-new-launch__field-group">
                    <span className="meg-new-launch__group-title">Categorias rápidas</span>
                    <div className="meg-new-launch__chips">
                      {categories.slice(0, 5).map(c => <button key={c.id} type="button" disabled={saving}
                        className={'meg-new-launch__chip' + (fields.categoryId === c.id ? ' is-selected' : '')}
                        aria-pressed={fields.categoryId === c.id} onClick={() => update('categoryId', c.id)}>{c.name}</button>)}
                    </div>
                  </div>
                  <div className="meg-new-launch__field-group">
                    <span className="meg-new-launch__group-title">Conta monetária *</span>
                    <div className="meg-new-launch__chips" aria-label="Atalhos de conta">
                      {accounts.slice(0, 3).map(a => <button type="button" key={a.id}
                        aria-pressed={fields.accountId === a.id} disabled={saving}
                        className={'meg-new-launch__chip' + (fields.accountId === a.id ? ' is-selected' : '')}
                        onClick={() => update('accountId', a.id)}>{a.name}</button>)}
                    </div>
                  </div>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="card" width={18}/>Conta *</span>
                    <select required value={fields.accountId} onChange={event => update('accountId', event.target.value)} disabled={saving}>
                      <option value="">Selecione uma conta</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="card" width={18}/>Forma de pagamento *</span>
                    <select required value={fields.paymentMethodId} onChange={event => update('paymentMethodId', event.target.value)} disabled={saving}>
                      <option value="">Selecione a forma de pagamento</option>
                      {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                  <div className="meg-new-launch__chips">
                    {methods.slice(0, 3).map(m => <button key={m.id} type="button" disabled={saving}
                      aria-pressed={fields.paymentMethodId === m.id}
                      className={'meg-new-launch__chip' + (fields.paymentMethodId === m.id ? ' is-selected' : '')}
                      onClick={() => update('paymentMethodId', m.id)}>{m.name}</button>)}
                  </div>
                </div>

                <div className="meg-new-launch__panel meg-new-launch__secondary">
                  <div className="meg-new-launch__date-amount">
                    <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="calendar" width={18}/>Data *</span>
                      <input required type="date" value={fields.day} disabled={saving} onChange={event => update('day', event.target.value)}/>
                    </label>
                    <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="card" width={18}/>Valor em reais *</span>
                      <input required inputMode="decimal" value={fields.amount} disabled={saving}
                        placeholder="0,00" onChange={event => update('amount', event.target.value)} />
                    </label>
                  </div>
                  <div className="meg-new-launch__field-group">
                    <span className="meg-new-launch__group-title"><Icon name="clock" width={18}/>Situação</span>
                    <div className="meg-new-launch__status" role="group" aria-label="Situação do lançamento">
                      <span className="is-active">{fields.type === 'income' ? 'Definida pelo servidor' : 'Pendente'}</span>
                      <span className="is-locked" aria-disabled="true">{fields.type === 'expense' ? 'Paga: não liberada' : 'Status final: servidor'}</span>
                    </div>
                    <p className="meg-new-launch__hint">{fields.type === 'expense'
                      ? 'Sem débito. Pagamento à vista depende da validação segura de saldo.'
                      : 'O servidor aplica o status financeiro da receita após confirmar a gravação.'}</p>
                  </div>
                  <div className="meg-new-launch__locked">
                    <strong><Icon name="card" width={18}/>Parcelamento no cartão</strong>
                    <small>Indisponível neste formulário. Compras parceladas usam o fluxo próprio de cartões.</small>
                  </div>
                  <label className="meg-new-launch__field"><span className="meg-new-launch__field-label"><Icon name="list" width={18}/>Observações (opcional)</span>
                    <textarea rows={4} maxLength={1000} value={fields.notes} disabled={saving}
                      onChange={event => update('notes', event.target.value)} placeholder="Informações adicionais..."/>
                  </label>
                </div>

                <aside className="meg-new-launch__summary" aria-label="Resumo do lançamento">
                  <div className="meg-new-launch__summary-title"><span className="meg-new-launch__summary-mark"><Icon name="list" width={24} height={24}/></span>
                    <div><h3>Resumo do lançamento</h3><p>Confira os dados antes de salvar.</p></div></div>
                  <div className={'meg-new-launch__amount' + (fields.type === 'expense' ? ' is-expense' : '')} data-testid="new-launch-summary-amount" aria-live="polite">
                    {visibleAmount === null ? 'Valor a informar' : currency.format(visibleAmount)}
                  </div>
                  <dl>
                    <div><dt><Icon name="list" width={16}/>Tipo</dt><dd>{fields.type === 'income' ? 'Receita' : 'Despesa pendente'}</dd></div>
                    <div><dt>Descrição</dt><dd>{fields.description || 'Não informada'}</dd></div>
                    <div><dt><Icon name="list" width={16}/>Categoria</dt><dd>{matchingCategory?.name || 'Não selecionada'}</dd></div>
                    <div><dt><Icon name="card" width={16}/>Conta</dt><dd>{matchingAccount?.name || 'Não selecionada'}</dd></div>
                    <div><dt><Icon name="card" width={16}/>Forma de pagamento</dt><dd>{matchingMethod?.name || 'Não selecionada'}</dd></div>
                    <div><dt><Icon name="calendar" width={16}/>Data</dt><dd data-testid="new-launch-summary-date">{formatLaunchDateBR(fields.day)}</dd></div>
                    <div><dt>Situação</dt><dd>{fields.type === 'income' ? 'Determinada pelo servidor' : 'Pendente, sem baixa'}</dd></div>
                  </dl>
                  <div className="meg-new-launch__summary-foot">Prévia das informações digitadas. Nenhuma movimentação é criada antes de salvar.</div>
                </aside>
              </div>
              {!completeCatalog && <p role="status" className="meg-new-launch__notice">Não há contas, categorias ou formas de pagamento elegíveis suficientes para concluir o registro.</p>}
              {error && <div role="alert" className="meg-new-launch__error"><p>{error}</p>
                {possibleDuplicate && <p>Possível duplicidade: {possibleDuplicate}. Nenhuma nova gravação foi confirmada.</p>}</div>}
              <footer className="meg-new-launch__footer">
                <button type="button" onClick={back} disabled={saving}><Icon name="chevronLeft" width={18}/> Voltar</button>
                <button type="submit" className="meg-new-launch__save" disabled={saving || !completeCatalog}>
                  {saving ? 'Salvando...' : '✓  Salvar lançamento'}</button>
              </footer>
            </form>}
          </>
        )}
      </section>
    </div>
  );
}
