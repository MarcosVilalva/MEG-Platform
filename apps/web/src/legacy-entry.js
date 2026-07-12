import { readSheet } from 'read-excel-file/browser';
import { bootstrapCloud } from './legacy-cloud.js';

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]+/gi, ' ')
  .trim()
  .toUpperCase();

function numberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!text) return 0;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) return `${brazilian[3]}-${brazilian[2].padStart(2, '0')}-${brazilian[1].padStart(2, '0')}`;
  const date = new Date(text);
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString().slice(0, 10);
}

async function parseMegWorkbook(file) {
    let workbookRows;
    try {
      workbookRows = await readSheet(file, 'LANÇAMENTOS');
    } catch {
      throw new Error('A aba LANÇAMENTOS não foi encontrada na planilha.');
    }
    const rows = Array.isArray(workbookRows?.[0]?.data) ? workbookRows[0].data : workbookRows;
    const headerIndex = rows.findIndex((row) => {
      const cells = row.map(normalize);
      return cells.includes('DATA') && cells.some((cell) => cell === 'TP LANCAMENTO');
    });
    if (headerIndex < 0) throw new Error('Cabeçalho da base MEG não encontrado.');

    const headers = rows[headerIndex].map(normalize);
    const column = (...names) => headers.findIndex((header) => names.map(normalize).includes(header));
    const indexes = {
      date: column('DATA'), weekday: column('DIASEMANA'), type: column('TP LANÇAMENTO'),
      description: column('DESCRIÇÃO'), income: column('RECEITA($)'), expenseClass: column('CLASSIFIÇÃO DA DESPESA', 'CLASSIFICAÇÃO DA DESPESA'),
      group: column('GRUPO'), expense: column('DESPESA (R$)'), payment: column('FORMA DE PAGAMENTO'),
      situation: column('SITUAÇÃO'), modality: column('MODADLIDADE', 'MODALIDADE'), notes: column('OBSERVAÇÕES')
    };
    if (Object.values(indexes).slice(0, 9).some((index) => index < 0)) throw new Error('A planilha não possui todas as colunas essenciais do MEG.');

    const transactions = [];
    let issues = 0;
    rows.slice(headerIndex + 1).forEach((row, offset) => {
      if (!row.some((value) => String(value ?? '').trim())) return;
      const date = isoDate(row[indexes.date]);
      const description = String(row[indexes.description] ?? '').trim();
      if (!date || !description) {
        issues += 1;
        return;
      }
      const launchType = normalize(row[indexes.type]) === 'RECEITA' ? 'RECEITA' : 'DESPESA';
      const type = launchType === 'RECEITA' ? 'income' : 'expense';
      const incomeAmount = numberValue(row[indexes.income]);
      const expenseAmount = numberValue(row[indexes.expense]);
      if (!incomeAmount && !expenseAmount) issues += 1;
      const rawSituation = normalize(row[indexes.situation]);
      const status = rawSituation === 'PENDENTE' ? 'pending' : 'paid';
      const paymentMethod = String(row[indexes.payment] ?? '').trim() || 'Não informado';
      const group = String(row[indexes.group] ?? '').trim();
      transactions.push({
        id: `meg-xlsx-${headerIndex + offset + 2}-${date}`,
        date,
        weekday: String(row[indexes.weekday] ?? '').trim(),
        launchType,
        type,
        description,
        incomeAmount,
        expenseAmount,
        amount: type === 'income' ? incomeAmount : expenseAmount,
        expenseClass: String(row[indexes.expenseClass] ?? '').trim(),
        group,
        category: type === 'income' ? 'Receitas' : group || 'Sem categoria',
        paymentMethod,
        account: paymentMethod,
        situation: status === 'paid' ? 'PAGO' : 'PENDENTE',
        status,
        modality: String(row[indexes.modality] ?? '').trim(),
        notes: String(row[indexes.notes] ?? '').trim(),
        source: 'BASE ATUALIZADA MEG.xlsx'
      });
    });
    return { transactions, issues };
}

function wireLegacyApp() {
  const userName = document.querySelector('#cloudUserName');
  const logoutButton = document.querySelector('#logoutBtn');
  const importInput = document.querySelector('#xlsxImport');
  const importStatus = document.querySelector('#xlsxImportStatus');
  const previewButton = document.querySelector('#previewNotificationsBtn');
  const sendButton = document.querySelector('#sendNotificationsBtn');
  const notificationPreview = document.querySelector('#notificationPreview');
  const recipientNameInput = document.querySelector('#recipientNameInput');
  const recipientPhoneInput = document.querySelector('#recipientPhoneInput');
  const addRecipientButton = document.querySelector('#addRecipientBtn');
  const recipientList = document.querySelector('#notificationRecipientList');
  if (userName) userName.textContent = window.MEG_CLOUD.user.name;
  logoutButton?.addEventListener('click', () => window.MEG_CLOUD.logout());

  async function loadRecipients() {
    if (!recipientList) return;
    try {
      const recipients = await window.MEG_CLOUD.listNotificationRecipients();
      recipientList.innerHTML = recipients.length
        ? recipients.map((item) => `<label class="recipient-item"><input type="checkbox" value="${item.id}" data-notification-recipient checked /><span><strong>${escapeMarkup(item.name)}</strong><small>${escapeMarkup(item.phone)}</small></span><button class="filter-clear-button" type="button" data-remove-recipient="${item.id}">Remover</button></label>`).join('')
        : '<span class="muted">Cadastre ao menos um WhatsApp para selecionar o envio.</span>';
    } catch (cause) {
      recipientList.innerHTML = `<span class="muted">${escapeMarkup(cause instanceof Error ? cause.message : 'Falha ao carregar destinatários.')}</span>`;
    }
  }

  function escapeMarkup(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  addRecipientButton?.addEventListener('click', async () => {
    try {
      await window.MEG_CLOUD.addNotificationRecipient(recipientNameInput.value, recipientPhoneInput.value);
      recipientNameInput.value = '';
      recipientPhoneInput.value = '';
      await loadRecipients();
    } catch (cause) {
      notificationPreview.textContent = cause instanceof Error ? cause.message : 'Não foi possível adicionar o destinatário.';
    }
  });

  recipientList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-recipient]');
    if (!button) return;
    await window.MEG_CLOUD.removeNotificationRecipient(button.dataset.removeRecipient);
    await loadRecipients();
  });

  previewButton?.addEventListener('click', async () => {
    notificationPreview.textContent = 'Gerando resumo...';
    try {
      const result = await window.MEG_CLOUD.previewNotifications();
      notificationPreview.textContent = result.text || 'Nenhuma conta exige atenção.';
    } catch (cause) {
      notificationPreview.textContent = cause instanceof Error ? cause.message : 'Falha ao gerar resumo.';
    }
  });

  sendButton?.addEventListener('click', async () => {
    notificationPreview.textContent = 'Enviando alertas...';
    try {
      const recipientIds = [...document.querySelectorAll('[data-notification-recipient]:checked')].map((item) => item.value);
      const hasRecipients = document.querySelectorAll('[data-notification-recipient]').length > 0;
      if (hasRecipients && !recipientIds.length) throw new Error('Selecione ao menos um número para o envio.');
      const result = await window.MEG_CLOUD.sendNotifications(recipientIds);
      const delivery = (result.deliveries || []).map((item) => `${item.recipient || item.channel}: ${item.status}${item.detail ? ` — ${item.detail}` : ''}`).join('\n');
      notificationPreview.textContent = `${result.digest?.text || result.message || ''}\n\nResultado do envio:\n${delivery || 'Nenhum canal enviado.'}`;
    } catch (cause) {
      notificationPreview.textContent = cause instanceof Error ? cause.message : 'Falha ao enviar alertas.';
    }
  });

  loadRecipients();

  importInput?.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  importStatus.textContent = 'Lendo e validando a planilha...';
  try {
    const result = await parseMegWorkbook(file);
    const income = result.transactions.reduce((sum, item) => sum + item.incomeAmount, 0);
    const expense = result.transactions.reduce((sum, item) => sum + item.expenseAmount, 0);
    const confirmation = confirm(
      `Importar ${result.transactions.length} lançamentos?\n\n` +
      `Receitas: ${income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
      `Despesas: ${expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n` +
      'A base atual na nuvem será substituída por esta planilha.'
    );
    if (!confirmation) {
      importStatus.textContent = 'Importação cancelada.';
      return;
    }
    window.MEG_APP.replaceImportedState(result.transactions, { cloud: false });
    await window.MEG_CLOUD.saveNow(window.MEG_APP.getState(), { force: true });
    importStatus.textContent = `${result.transactions.length} lançamentos importados e salvos na nuvem. ${result.issues} linha(s) exigem revisão.`;
  } catch (cause) {
    importStatus.textContent = cause instanceof Error ? cause.message : 'Não foi possível importar a planilha.';
  } finally {
    importInput.value = '';
  }
  });
}

async function start() {
  await bootstrapCloud();
  await import('./legacy-app.js');
  wireLegacyApp();
}

start().catch((cause) => {
  const message = cause instanceof Error ? cause.message : 'Não foi possível iniciar o MEG.';
  document.body.insertAdjacentHTML('beforeend', `<div class="fatal-error"><strong>Não foi possível abrir o MEG</strong><span>${message}</span><button onclick="location.reload()">Tentar novamente</button></div>`);
});
