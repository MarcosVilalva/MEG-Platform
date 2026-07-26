import { installmentDueDate } from './legacy-installments.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function weekdayShort(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
}

function dateForInvoiceMonth(monthCode, dueDay) {
  const [year, month] = String(monthCode || '').split('-').map(Number);
  if (!year || !month || !dueDay) throw new Error('Selecione o mês da próxima fatura e um cartão com vencimento cadastrado.');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const date = new Date(Date.UTC(year, month - 1, Math.min(Number(dueDay), lastDay)));
  if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 2);
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function currentMonthCode() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function ensureFields() {
  const formGrid = document.querySelector('#transactionForm .form-grid');
  const installmentFields = document.querySelector('#installmentFields');
  if (!formGrid || !installmentFields || document.querySelector('#ongoingInstallmentPanel')) return;

  const panel = document.createElement('section');
  panel.id = 'ongoingInstallmentPanel';
  panel.className = 'ongoing-installment-panel full hidden';
  panel.innerHTML = `
    <div class="ongoing-installment-head">
      <div><small>IMPLANTAÇÃO DO MEG</small><strong>Parcelamento já em andamento</strong></div>
      <label class="ongoing-switch"><input id="ongoingInstallmentEnabled" type="checkbox" /><span>Ativar</span></label>
    </div>
    <p>Use esta opção para compras feitas antes do MEG. Serão criadas somente a próxima parcela e as parcelas restantes, sem recriar meses anteriores.</p>
    <div class="ongoing-installment-grid hidden" id="ongoingInstallmentFields">
      <label>VALOR ORIGINAL DA COMPRA<input id="ongoingOriginalTotal" type="number" min="0.01" step="0.01" inputmode="decimal" /></label>
      <label>VALOR DE CADA PARCELA<input id="ongoingInstallmentAmount" type="number" min="0.01" step="0.01" inputmode="decimal" /></label>
      <label>TOTAL ORIGINAL DE PARCELAS<input id="ongoingTotalCount" type="number" min="2" max="120" step="1" /></label>
      <label>PRÓXIMA PARCELA<input id="ongoingNextNumber" type="number" min="1" max="120" step="1" /></label>
      <label>MÊS DA PRÓXIMA FATURA<input id="ongoingFirstInvoiceMonth" type="month" /></label>
      <label>DATA ORIGINAL DA COMPRA (OPCIONAL)<input id="ongoingPurchaseDate" type="date" /></label>
      <div class="ongoing-installment-preview full" id="ongoingInstallmentPreview">Informe os dados para visualizar as parcelas que serão criadas.</div>
    </div>`;
  installmentFields.insertAdjacentElement('beforebegin', panel);

  const enabled = panel.querySelector('#ongoingInstallmentEnabled');
  const fields = panel.querySelector('#ongoingInstallmentFields');
  enabled.addEventListener('change', () => {
    fields.classList.toggle('hidden', !enabled.checked);
    installmentFields.classList.toggle('hidden', enabled.checked || installmentFields.classList.contains('hidden'));
    updatePreview();
  });
  panel.querySelectorAll('input').forEach((input) => input.addEventListener('input', updatePreview));
  panel.querySelector('#ongoingFirstInvoiceMonth').value = currentMonthCode();
}

function isCreditCardNewExpense() {
  const transactionId = document.querySelector('#transactionId')?.value;
  const type = document.querySelector('#transactionType')?.value;
  const modality = normalize(document.querySelector('#modalityInput')?.value);
  return !transactionId && type === 'expense' && modality === 'CREDITO';
}

function syncVisibility() {
  ensureFields();
  const panel = document.querySelector('#ongoingInstallmentPanel');
  if (!panel) return;
  const visible = isCreditCardNewExpense();
  panel.classList.toggle('hidden', !visible);
  if (!visible) {
    const enabled = panel.querySelector('#ongoingInstallmentEnabled');
    if (enabled) enabled.checked = false;
    panel.querySelector('#ongoingInstallmentFields')?.classList.add('hidden');
  }
}

function cardForPayment(state, paymentMethod) {
  return (state?.catalogs?.cards || []).find((card) => normalize(card.paymentMethod) === normalize(paymentMethod));
}

function readOngoingValues() {
  const totalCount = Number.parseInt(document.querySelector('#ongoingTotalCount')?.value || '0', 10);
  const nextNumber = Number.parseInt(document.querySelector('#ongoingNextNumber')?.value || '0', 10);
  const installmentAmount = Number(document.querySelector('#ongoingInstallmentAmount')?.value || 0);
  const originalTotal = Number(document.querySelector('#ongoingOriginalTotal')?.value || 0);
  const firstInvoiceMonth = document.querySelector('#ongoingFirstInvoiceMonth')?.value || '';
  const purchaseDate = document.querySelector('#ongoingPurchaseDate')?.value || '';
  return { totalCount, nextNumber, installmentAmount, originalTotal, firstInvoiceMonth, purchaseDate };
}

function updatePreview() {
  const preview = document.querySelector('#ongoingInstallmentPreview');
  if (!preview) return;
  const { totalCount, nextNumber, installmentAmount, firstInvoiceMonth } = readOngoingValues();
  if (!totalCount || !nextNumber || !installmentAmount || !firstInvoiceMonth || nextNumber > totalCount) {
    preview.textContent = 'Informe os dados para visualizar as parcelas que serão criadas.';
    return;
  }
  const remaining = totalCount - nextNumber + 1;
  preview.innerHTML = `<strong>${remaining} parcela(s) serão criadas</strong><span>Da ${nextNumber}/${totalCount} até ${totalCount}/${totalCount} · impacto futuro ${money.format(remaining * installmentAmount)}</span>`;
}

function validate(values, card) {
  if (!card) throw new Error('Cadastre ou selecione um cartão com dia de vencimento definido.');
  if (!values.originalTotal || values.originalTotal <= 0) throw new Error('Informe o valor original da compra.');
  if (!values.installmentAmount || values.installmentAmount <= 0) throw new Error('Informe o valor de cada parcela.');
  if (!values.totalCount || values.totalCount < 2) throw new Error('Informe o total original de parcelas.');
  if (!values.nextNumber || values.nextNumber < 1 || values.nextNumber > values.totalCount) throw new Error('A próxima parcela deve estar entre 1 e o total original.');
  if (!values.firstInvoiceMonth) throw new Error('Informe o mês da próxima fatura.');
}

function createTransactions(state, values, card) {
  const description = document.querySelector('#descriptionInput')?.value.trim();
  const paymentMethod = document.querySelector('#paymentMethodInput')?.value.trim();
  const group = document.querySelector('#groupInput')?.value.trim();
  const expenseClass = document.querySelector('#expenseClassInput')?.value.trim();
  const modality = document.querySelector('#modalityInput')?.value.trim();
  const notes = document.querySelector('#notesInput')?.value.trim();
  const financialAccountId = document.querySelector('#financialAccountInput')?.value || '';
  if (!description) throw new Error('Informe a descrição da compra.');
  if (!paymentMethod) throw new Error('Selecione o cartão utilizado.');

  const account = (state.catalogs?.accounts || []).find((item) => item.id === financialAccountId);
  const firstDueDate = dateForInvoiceMonth(values.firstInvoiceMonth, card.dueDay);
  const remaining = values.totalCount - values.nextNumber + 1;
  const seriesId = crypto.randomUUID();

  return Array.from({ length: remaining }, (_, offset) => {
    const installmentNumber = values.nextNumber + offset;
    const date = installmentDueDate(firstDueDate, offset);
    return {
      id: crypto.randomUUID(),
      date,
      ...(values.purchaseDate ? { purchaseDate: values.purchaseDate } : {}),
      weekday: weekdayShort(date),
      description: `${description} ${installmentNumber}/${values.totalCount}`,
      type: 'expense',
      launchType: 'DESPESA',
      incomeAmount: 0,
      expenseAmount: values.installmentAmount,
      amount: values.installmentAmount,
      expenseClass,
      group,
      category: group || 'Sem categoria',
      paymentMethod,
      account: paymentMethod,
      financialAccountId: account?.id || financialAccountId,
      financialScope: account?.type === 'BENEFIT' ? 'benefit' : 'monetary',
      status: 'pending',
      situation: 'PENDENTE',
      modality,
      notes: [notes, 'Parcelamento anterior à implantação do MEG'].filter(Boolean).join(' · '),
      installmentSeriesId: seriesId,
      installmentNumber,
      installmentCount: values.totalCount,
      purchaseTotal: values.originalTotal,
      originalPurchaseTotal: values.originalTotal,
      installmentOrigin: 'PRE_MEG',
      legacyInstallment: true,
      firstMegInstallmentNumber: values.nextNumber,
    };
  });
}

function handleSubmit(event) {
  const enabled = document.querySelector('#ongoingInstallmentEnabled')?.checked;
  if (!enabled || !isCreditCardNewExpense()) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    const state = window.MEG_APP?.getState?.();
    if (!state) throw new Error('A base financeira ainda não está pronta.');
    const paymentMethod = document.querySelector('#paymentMethodInput')?.value.trim();
    const card = cardForPayment(state, paymentMethod);
    const values = readOngoingValues();
    validate(values, card);
    const transactions = createTransactions(state, values, card);
    const nextState = structuredClone(state);
    nextState.transactions.push(...transactions);
    const category = transactions[0]?.category;
    if (category && nextState.budgets && !nextState.budgets[category]) nextState.budgets[category] = 0;
    window.MEG_APP.replaceState(nextState);
    window.MEG_CLOUD?.saveState?.(nextState);
    document.querySelector('#transactionDialog')?.close();
    window.MEG_APP?.showToast?.(
      'Parcelamento em andamento criado',
      `${transactions.length} parcela(s), da ${values.nextNumber}/${values.totalCount} até ${values.totalCount}/${values.totalCount}, foram adicionadas sem recriar o histórico anterior.`,
      'success'
    );
  } catch (cause) {
    window.MEG_APP?.showToast?.('Revise o parcelamento em andamento', cause instanceof Error ? cause.message : 'Não foi possível criar as parcelas.', 'danger');
  }
}

function resetPanel() {
  const panel = document.querySelector('#ongoingInstallmentPanel');
  if (!panel) return;
  panel.querySelector('#ongoingInstallmentEnabled').checked = false;
  panel.querySelector('#ongoingInstallmentFields').classList.add('hidden');
  panel.querySelector('#ongoingOriginalTotal').value = '';
  panel.querySelector('#ongoingInstallmentAmount').value = '';
  panel.querySelector('#ongoingTotalCount').value = '';
  panel.querySelector('#ongoingNextNumber').value = '';
  panel.querySelector('#ongoingFirstInvoiceMonth').value = currentMonthCode();
  panel.querySelector('#ongoingPurchaseDate').value = '';
  updatePreview();
}

function start() {
  ensureFields();
  const form = document.querySelector('#transactionForm');
  form?.addEventListener('submit', handleSubmit, { capture: true });
  document.querySelector('#transactionDialog')?.addEventListener('close', resetPanel);
  ['transactionType', 'modalityInput', 'paymentMethodInput', 'transactionId'].forEach((id) => {
    document.querySelector(`#${id}`)?.addEventListener('change', () => requestAnimationFrame(syncVisibility));
  });
  new MutationObserver(syncVisibility).observe(document.body, { childList: true, subtree: true });
  syncVisibility();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
