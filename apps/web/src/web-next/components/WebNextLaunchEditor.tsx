import type { KeyboardEvent, ReactNode } from 'react';
import { WebNextIcon } from './WebNextIcon';
import '../styles/launch-editor.css';

export type WebNextLaunchType = 'expense' | 'income' | 'transfer';
export type WebNextLaunchSituation = 'planned' | 'paid';

export type WebNextLaunchDraft = {
  type: WebNextLaunchType;
  situation: WebNextLaunchSituation;
  description: string;
  accountId: string;
  destinationId: string;
  eventDate: string;
  classification: string;
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

type Option = { id: string; name: string; type?: string | null };
type Installment = { number: number; cents: number; dueDate: string };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'A definir';
  return fullDate.format(new Date(value + 'T12:00:00Z'));
}

function typeLabel(type: WebNextLaunchType) {
  if (type === 'income') return 'Receita';
  if (type === 'transfer') return 'Transferência';
  return 'Despesa';
}

export function WebNextLaunchEditor({
  editing,
  draft,
  amountCents,
  negative,
  benefit,
  credit,
  crediario,
  effectiveSituation,
  situationRule,
  accounts,
  classifications,
  expenseGroups,
  incomeCategories,
  paymentMethods,
  cards,
  selectedCardName,
  selectedCategoryName,
  sourceAccountName,
  destinationAccountName,
  calculatedDue,
  installmentPreview,
  validationVisible,
  missing,
  duplicateMessage,
  editMessage,
  advancedOpen,
  installmentPreviewOpen,
  discardConfirmOpen,
  settlementConfirmOpen,
  deleteConfirmOpen,
  savingEdit,
  deletingEvent,
  canArchive,
  writeControl,
  onClose,
  onDiscardConfirm,
  onDiscardCancel,
  onSettlementConfirm,
  onSettlementCancel,
  onDeleteConfirm,
  onDeleteCancel,
  onSaveEdit,
  onRequestDelete,
  onTypeChange,
  onDraftChange,
  onClassificationChange,
  onMoneyChange,
  onMoneyKeyDown,
  onSignChange,
  onAdvancedToggle,
  onInstallmentPreviewOpen,
  onInstallmentPreviewClose,
}: {
  editing: boolean;
  draft: WebNextLaunchDraft;
  amountCents: number;
  negative: boolean;
  benefit: boolean;
  credit: boolean;
  crediario: boolean;
  effectiveSituation: WebNextLaunchSituation;
  situationRule: string;
  accounts: Option[];
  classifications: string[];
  expenseGroups: Option[];
  incomeCategories: Option[];
  paymentMethods: Option[];
  cards: Option[];
  selectedCardName?: string;
  selectedCategoryName?: string;
  sourceAccountName: string;
  destinationAccountName: string;
  calculatedDue: string;
  installmentPreview: Installment[];
  validationVisible: boolean;
  missing: string[];
  duplicateMessage?: string | null;
  editMessage: string;
  advancedOpen: boolean;
  installmentPreviewOpen: boolean;
  discardConfirmOpen: boolean;
  settlementConfirmOpen: boolean;
  deleteConfirmOpen: boolean;
  savingEdit: boolean;
  deletingEvent: boolean;
  canArchive: boolean;
  writeControl: ReactNode;
  onClose: () => void;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
  onSettlementConfirm: () => void;
  onSettlementCancel: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onSaveEdit: () => void;
  onRequestDelete: () => void;
  onTypeChange: (type: WebNextLaunchType) => void;
  onDraftChange: <K extends keyof WebNextLaunchDraft>(key: K, value: WebNextLaunchDraft[K]) => void;
  onClassificationChange: (value: string) => void;
  onMoneyChange: (value: string) => void;
  onMoneyKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSignChange: (negative: boolean) => void;
  onAdvancedToggle: () => void;
  onInstallmentPreviewOpen: () => void;
  onInstallmentPreviewClose: () => void;
}) {
  const invalid = (key: string) => validationVisible && missing.includes(key);
  const installmentMax = credit ? 48 : 120;
  const amount = (negative ? -1 : 1) * amountCents / 100;
  const installmentValue = installmentPreview[0]?.cents || 0;

  return <div className="mnx-launch-editor-overlay" data-web-next-overlay="launch-editor">
    <button className="mnx-launch-editor-backdrop" type="button" aria-label="Fechar lançamento" onClick={onClose} />

    <aside className="mnx-launch-editor" role="dialog" aria-modal="true" aria-label={editing ? 'Editar lançamento' : 'Novo lançamento'}>
      <header className="mnx-launch-editor-head">
        <div className={'mnx-launch-editor-mark is-' + (benefit ? 'benefit' : draft.type)}>
          <WebNextIcon name={benefit ? 'food' : draft.type === 'income' ? 'receivables' : draft.type === 'transfer' ? 'cashflow' : 'payables'} />
        </div>
        <div>
          <span>{editing ? 'EDITAR LANÇAMENTO' : 'NOVO LANÇAMENTO'}</span>
          <h2>{editing ? draft.description || 'Editar movimento' : 'Registrar movimento'}</h2>
          <p>{benefit ? 'Benefício Alimentação' : typeLabel(draft.type)} · regras financeiras preservadas</p>
        </div>
        <button type="button" className="mnx-launch-editor-close" aria-label="Fechar" onClick={onClose}>×</button>
      </header>

      <div className="mnx-launch-editor-body" data-meg-scroll-region="true">
        <section className="mnx-launch-type-switch" aria-label="Tipo do lançamento">
          {(['expense','income','transfer'] as WebNextLaunchType[]).map((item) => <button
            key={item}
            type="button"
            className={draft.type === item ? 'is-active' : ''}
            onClick={() => onTypeChange(item)}
          >
            <WebNextIcon name={item === 'income' ? 'receivables' : item === 'transfer' ? 'cashflow' : 'payables'} />
            <span><strong>{typeLabel(item)}</strong><small>{item === 'income' ? 'Entrada' : item === 'transfer' ? 'Entre contas' : 'Saída'}</small></span>
          </button>)}
        </section>

        {benefit ? <div className="mnx-launch-benefit-banner">
          <WebNextIcon name="food" />
          <div><strong>Alimentação ativa</strong><span>Conta benefício e Verocard permanecem travados. Este movimento não altera o caixa monetário.</span></div>
        </div> : null}

        <section className="mnx-launch-section">
          <header><span>01</span><div><strong>Dados principais</strong><small>O que aconteceu e quando</small></div></header>

          <label className={'mnx-launch-field is-wide ' + (invalid('descrição') ? 'is-invalid' : '')}>
            <span>Descrição *</span>
            <input
              value={draft.description}
              onChange={(event) => onDraftChange('description', event.target.value)}
              maxLength={120}
              autoComplete="off"
              placeholder="Ex.: supermercado, salário ou transferência"
            />
            {invalid('descrição') ? <small>Preencha a descrição.</small> : null}
          </label>

          <div className="mnx-launch-grid">
            {!credit ? <label className={'mnx-launch-field ' + (invalid(draft.type === 'transfer' ? 'conta de origem' : 'conta') ? 'is-invalid' : '')}>
              <span>{draft.type === 'transfer' ? 'Conta de origem *' : 'Conta financeira *'}</span>
              <select value={draft.accountId} disabled={benefit} onChange={(event) => onDraftChange('accountId', event.target.value)}>
                <option value="">Selecione</option>
                {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {invalid(draft.type === 'transfer' ? 'conta de origem' : 'conta') ? <small>Selecione a conta.</small> : null}
            </label> : <div className="mnx-launch-rule-card">
              <span>Impacto no caixa</span>
              <strong>Somente no pagamento da fatura</strong>
              <small>A compra no cartão não movimenta uma conta monetária agora.</small>
            </div>}

            <label className={'mnx-launch-field ' + (invalid('data') ? 'is-invalid' : '')}>
              <span>{credit ? 'Data da compra *' : 'Data do evento *'}</span>
              <input type="date" value={draft.eventDate} onChange={(event) => onDraftChange('eventDate', event.target.value)} />
              {invalid('data') ? <small>Informe a data.</small> : null}
            </label>
          </div>

          {draft.type === 'transfer' ? <div className="mnx-transfer-route">
            <div className="mnx-transfer-route-visual">
              <span><small>Origem</small><strong>{sourceAccountName}</strong></span>
              <i><WebNextIcon name="chevron" /></i>
              <span><small>Destino</small><strong>{destinationAccountName}</strong></span>
            </div>
            <label className={'mnx-launch-field ' + (
              invalid('conta de destino') || invalid('destino diferente da origem') || invalid('contas monetárias válidas') ? 'is-invalid' : ''
            )}>
              <span>Conta de destino *</span>
              <select value={draft.destinationId} onChange={(event) => onDraftChange('destinationId', event.target.value)}>
                <option value="">Selecione uma conta diferente</option>
                {accounts.filter((item) => item.id !== draft.accountId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {invalid('conta de destino') ? <small>Selecione a conta de destino.</small>
                : invalid('destino diferente da origem') ? <small>Origem e destino devem ser diferentes.</small>
                : invalid('contas monetárias válidas') ? <small>Use duas contas monetárias válidas.</small>
                : null}
            </label>
          </div> : null}

          <div className="mnx-launch-amount">
            <label className={'mnx-launch-field ' + (invalid('valor') ? 'is-invalid' : '')}>
              <span>Valor total *</span>
              <input
                className="mnx-launch-money"
                inputMode="decimal"
                value={money.format(amount)}
                onChange={(event) => onMoneyChange(event.target.value)}
                onKeyDown={onMoneyKeyDown}
              />
              {invalid('valor') ? <small>Informe um valor diferente de zero.</small> : <small>Digite o valor do movimento.</small>}
            </label>

            {draft.type !== 'transfer' ? <div className="mnx-launch-sign" role="group" aria-label="Sinal do valor">
              <button type="button" className={!negative ? 'is-active positive' : ''} onClick={() => onSignChange(false)}>+ Positivo</button>
              <button type="button" className={negative ? 'is-active negative' : ''} onClick={() => onSignChange(true)}>− Estorno</button>
            </div> : null}
          </div>

          {negative && amountCents > 0 ? <div className="mnx-launch-warning">
            <strong>Valor negativo</strong><span>O sinal será preservado como estorno ou reversão.</span>
          </div> : null}
        </section>

        {draft.type !== 'transfer' ? <section className="mnx-launch-section">
          <header><span>02</span><div><strong>{draft.type === 'income' ? 'Recebimento' : 'Classificação'}</strong><small>Como este movimento deve aparecer no MEG</small></div></header>

          {draft.type === 'expense' ? <div className="mnx-launch-grid">
            <label className={'mnx-launch-field ' + (invalid('classificação') ? 'is-invalid' : '')}>
              <span>Classificação *</span>
              <select value={draft.classification} onChange={(event) => onClassificationChange(event.target.value)}>
                <option value="">Selecione a classificação</option>
                {classifications.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {invalid('classificação') ? <small>Selecione a classificação.</small> : null}
            </label>

            <label className={'mnx-launch-field ' + (invalid('grupo') ? 'is-invalid' : '')}>
              <span>Grupo *</span>
              <select value={draft.categoryId} disabled={!draft.classification} onChange={(event) => onDraftChange('categoryId', event.target.value)}>
                <option value="">{draft.classification ? 'Selecione o grupo' : 'Escolha a classificação primeiro'}</option>
                {expenseGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {invalid('grupo') ? <small>Selecione o grupo.</small> : null}
            </label>
          </div> : <label className="mnx-launch-field is-wide">
            <span>Classificação da receita</span>
            <select value={draft.categoryId} onChange={(event) => onDraftChange('categoryId', event.target.value)}>
              <option value="">Sem classificação</option>
              {incomeCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>}

          <div className="mnx-launch-grid">
            <label className={'mnx-launch-field ' + (invalid(draft.type === 'income' ? 'forma de recebimento' : 'forma de pagamento') ? 'is-invalid' : '')}>
              <span>{draft.type === 'income' ? 'Forma de recebimento *' : 'Forma de pagamento *'}</span>
              <select value={draft.paymentMethodId} disabled={benefit} onChange={(event) => onDraftChange('paymentMethodId', event.target.value)}>
                <option value="">Selecione</option>
                {paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {invalid(draft.type === 'income' ? 'forma de recebimento' : 'forma de pagamento') ? <small>Selecione a forma.</small> : null}
            </label>

            {draft.type === 'income' ? <div className="mnx-launch-rule-card is-positive">
              <span>Situação</span><strong>Recebida</strong><small>Receitas são sempre registradas como recebidas.</small>
            </div> : <label className="mnx-launch-field">
              <span>Situação *</span>
              <select
                value={effectiveSituation}
                disabled={Boolean(situationRule)}
                onChange={(event) => onDraftChange('situation', event.target.value as WebNextLaunchSituation)}
              >
                <option value="paid">Pago</option>
                <option value="planned">Pendente</option>
              </select>
              <small>{situationRule || 'Escolha se já foi pago ou permanece pendente.'}</small>
            </label>}
          </div>

          {credit ? <div className="mnx-launch-card-config">
            <div className="mnx-launch-card-config-head">
              <WebNextIcon name="cards" />
              <div><strong>Compra no cartão</strong><small>A compra entra na fatura e não reduz o caixa agora.</small></div>
            </div>
            <div className="mnx-launch-grid">
              <label className={'mnx-launch-field ' + (invalid('cartão') ? 'is-invalid' : '')}>
                <span>Cartão *</span>
                <select value={draft.cardId} onChange={(event) => onDraftChange('cardId', event.target.value)}>
                  <option value="">Selecione o cartão cadastrado</option>
                  {cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                {invalid('cartão') ? <small>Selecione o cartão.</small> : null}
              </label>
              <div className="mnx-launch-rule-card">
                <span>Vencimento calculado</span>
                <strong>{dateLabel(calculatedDue)}</strong>
                <small>{selectedCardName ? 'Cartão ' + selectedCardName : 'Selecione o cartão'}</small>
              </div>
            </div>
          </div> : null}

          {(credit || crediario) ? <div className="mnx-installment-card">
            <div className="mnx-launch-grid">
              <label className="mnx-launch-field">
                <span>Quantidade de parcelas *</span>
                <div className="mnx-installment-stepper">
                  <button type="button" disabled={draft.installments <= 1} onClick={() => onDraftChange('installments', Math.max(1, draft.installments - 1))}>−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={installmentMax}
                    value={draft.installments}
                    onChange={(event) => onDraftChange('installments', Math.min(installmentMax, Math.max(1, Number(event.target.value) || 1)))}
                  />
                  <button type="button" disabled={draft.installments >= installmentMax} onClick={() => onDraftChange('installments', Math.min(installmentMax, draft.installments + 1))}>+</button>
                </div>
              </label>

              <label className="mnx-launch-field">
                <span>Vencimento da 1ª parcela</span>
                <input type="date" disabled={credit} value={credit ? calculatedDue : draft.firstDue} onChange={(event) => onDraftChange('firstDue', event.target.value)} />
              </label>
            </div>

            {draft.installments > 1 && amountCents > 0 ? <div className="mnx-installment-summary">
              <div><strong>{draft.installments}x de {money.format(installmentValue / 100)}</strong><small>Total {money.format(amountCents / 100)}</small></div>
              <button type="button" onClick={onInstallmentPreviewOpen}>Visualizar parcelas</button>
            </div> : null}
          </div> : null}
        </section> : null}

        <section className="mnx-launch-section is-advanced">
          <button className="mnx-launch-advanced-toggle" type="button" aria-expanded={advancedOpen} onClick={onAdvancedToggle}>
            <span><strong>Mais opções</strong><small>Recorrência, modelo e observações</small></span><b>{advancedOpen ? '−' : '+'}</b>
          </button>

          {advancedOpen ? <div className="mnx-launch-advanced">
            <label className="mnx-launch-switch">
              <span><strong>Lançamento recorrente</strong><small>Cria eventos conforme a periodicidade configurada.</small></span>
              <input type="checkbox" checked={draft.recurring} onChange={(event) => onDraftChange('recurring', event.target.checked)} />
            </label>

            {draft.recurring ? <div className="mnx-launch-grid">
              <label className="mnx-launch-field">
                <span>Periodicidade *</span>
                <select value={draft.recurrenceFrequency} onChange={(event) => onDraftChange('recurrenceFrequency', event.target.value as WebNextLaunchDraft['recurrenceFrequency'])}>
                  <option>Mensal</option><option>Semanal</option><option>Anual</option>
                </select>
              </label>
              <label className={'mnx-launch-field ' + (invalid('quantidade da recorrência') ? 'is-invalid' : '')}>
                <span>Quantidade *</span>
                <input type="number" min={2} max={120} value={draft.recurrenceCount} onChange={(event) => onDraftChange('recurrenceCount', Number(event.target.value) || 0)} />
                {invalid('quantidade da recorrência') ? <small>Informe ao menos 2 ocorrências.</small> : null}
              </label>
            </div> : null}

            <label className="mnx-launch-switch">
              <span><strong>Salvar como modelo</strong><small>Mantém esta configuração disponível para uso futuro.</small></span>
              <input type="checkbox" checked={draft.saveTemplate} onChange={(event) => onDraftChange('saveTemplate', event.target.checked)} />
            </label>

            {draft.saveTemplate ? <label className={'mnx-launch-field is-wide ' + (invalid('nome do modelo') ? 'is-invalid' : '')}>
              <span>Nome do modelo *</span>
              <input maxLength={60} value={draft.templateName} onChange={(event) => onDraftChange('templateName', event.target.value)} placeholder="Ex.: Compra mensal" />
              {invalid('nome do modelo') ? <small>Informe um nome para o modelo.</small> : null}
            </label> : null}

            <label className="mnx-launch-field is-wide">
              <span>Observações opcionais</span>
              <textarea maxLength={500} value={draft.notes} onChange={(event) => onDraftChange('notes', event.target.value)} placeholder="Inclua informações úteis para consulta futura" />
            </label>
          </div> : null}
        </section>

        <section className="mnx-launch-review">
          <header><span>RESUMO</span><strong>Antes de confirmar</strong></header>
          <div className="mnx-launch-review-grid">
            <div><span>Tipo</span><strong>{benefit ? 'Benefício' : typeLabel(draft.type)}</strong></div>
            <div><span>Valor</span><strong className={negative ? 'negative' : 'positive'}>{money.format(amount)}</strong></div>
            <div><span>Escopo</span><strong>{credit ? 'Cartão ' + (selectedCardName || 'não selecionado') : draft.type === 'transfer' ? sourceAccountName + ' → ' + destinationAccountName : sourceAccountName}</strong></div>
            <div><span>Situação</span><strong>{draft.type === 'income' ? 'Recebida' : draft.type === 'transfer' ? 'Fluxo entre contas' : effectiveSituation === 'paid' ? 'Pago' : 'Pendente'}</strong></div>
            {draft.type === 'expense' ? <div><span>Grupo</span><strong>{selectedCategoryName || '—'}</strong></div> : null}
            {credit ? <div><span>Fatura</span><strong>{dateLabel(calculatedDue)}</strong></div> : null}
          </div>
        </section>

        {duplicateMessage ? <div className="mnx-launch-duplicate"><strong>Possível duplicidade</strong><span>{duplicateMessage}</span></div> : null}
        {validationVisible && missing.length ? <div className="mnx-launch-validation">Revise os campos destacados antes de continuar.</div> : null}
        {editMessage ? <div className="mnx-launch-message">{editMessage}</div> : null}
      </div>

      <footer className="mnx-launch-editor-footer">
        {editing ? <>
          <button className="primary" type="button" disabled={savingEdit || deletingEvent || Boolean(duplicateMessage)} onClick={onSaveEdit}>
            {savingEdit ? 'Salvando…' : duplicateMessage ? 'Revise a possível duplicidade' : 'Salvar alterações'}
          </button>
          <button type="button" disabled={savingEdit || deletingEvent} onClick={onClose}>Cancelar</button>
          {canArchive ? <button className="danger" type="button" disabled={savingEdit || deletingEvent} onClick={onRequestDelete}>Excluir</button> : null}
        </> : writeControl}
      </footer>
    </aside>

    {installmentPreviewOpen ? <div className="mnx-launch-submodal">
      <button className="mnx-launch-submodal-backdrop" type="button" aria-label="Fechar parcelas" onClick={onInstallmentPreviewClose} />
      <section className="mnx-launch-submodal-card" role="dialog" aria-modal="true">
        <header><div><span>PARCELAMENTO</span><h3>{draft.installments} parcelas</h3><p>{draft.description || 'Nova despesa'} · total {money.format(amountCents / 100)}</p></div><button type="button" onClick={onInstallmentPreviewClose}>×</button></header>
        <div className="mnx-launch-installment-list">
          {installmentPreview.map((item) => <div key={item.number}><span><strong>{item.number}/{draft.installments}</strong><small>{item.dueDate ? dateLabel(item.dueDate) : 'Vencimento a definir'}</small></span><strong>{money.format(item.cents / 100)}</strong></div>)}
        </div>
        <footer><span>Total conferido</span><strong>{money.format(installmentPreview.reduce((sum, item) => sum + item.cents, 0) / 100)}</strong></footer>
      </section>
    </div> : null}

    {discardConfirmOpen ? <ConfirmLayer
      kicker="ALTERAÇÕES NÃO SALVAS"
      title="Descartar alterações?"
      message="As mudanças deste lançamento ainda não foram gravadas."
      cancel="Continuar editando"
      confirm="Descartar alterações"
      danger
      onCancel={onDiscardCancel}
      onConfirm={onDiscardConfirm}
    /> : null}

    {settlementConfirmOpen ? <ConfirmLayer
      kicker="BAIXA DE PENDÊNCIA"
      title="Deseja realmente baixar a pendência?"
      message={(draft.description || 'Lançamento') + ' · ' + money.format(amount) + '. Ao confirmar, o status será Pago e o MEG registrará a baixa financeira.'}
      cancel="Não"
      confirm={savingEdit ? 'Baixando…' : 'Sim, baixar'}
      danger
      disabled={savingEdit}
      onCancel={onSettlementCancel}
      onConfirm={onSettlementConfirm}
    /> : null}

    {deleteConfirmOpen ? <ConfirmLayer
      kicker="EXCLUIR LANÇAMENTO"
      title="Deseja excluir este lançamento?"
      message={(draft.description || 'Lançamento selecionado') + ' será retirado dos saldos e da listagem, mantendo o registro de auditoria.'}
      cancel="Cancelar"
      confirm={deletingEvent ? 'Excluindo…' : 'Sim, excluir'}
      danger
      disabled={deletingEvent}
      onCancel={onDeleteCancel}
      onConfirm={onDeleteConfirm}
    /> : null}
  </div>;
}

function ConfirmLayer({
  kicker,
  title,
  message,
  cancel,
  confirm,
  danger = false,
  disabled = false,
  onCancel,
  onConfirm,
}: {
  kicker: string;
  title: string;
  message: string;
  cancel: string;
  confirm: string;
  danger?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <div className="mnx-launch-submodal is-confirm">
    <button className="mnx-launch-submodal-backdrop" type="button" aria-label={cancel} onClick={onCancel} />
    <section className="mnx-launch-confirm-card" role="alertdialog" aria-modal="true">
      <div className={'mnx-launch-confirm-icon ' + (danger ? 'is-danger' : '')}><WebNextIcon name="bell" /></div>
      <div><span>{kicker}</span><h3>{title}</h3><p>{message}</p></div>
      <footer><button type="button" onClick={onCancel} disabled={disabled}>{cancel}</button><button className={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm} disabled={disabled}>{confirm}</button></footer>
    </section>
  </div>;
}
