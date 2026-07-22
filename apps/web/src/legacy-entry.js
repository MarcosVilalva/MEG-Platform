import { readSheet } from 'read-excel-file/browser';
import { bootstrapCloud } from './legacy-cloud.js';
import { excelDateToIso } from './legacy-import-utils.js';
import { syncLocalDueNotifications } from './native-notifications.js';
import { checkForAppUpdate } from './native-app-update.js';

const appEnvironment = import.meta.env.VITE_APP_ENV || 'production';
const appEnvironmentSuffix = appEnvironment === 'production' ? '' : `-${appEnvironment}`;
const validationMode = import.meta.env.VITE_VALIDATION_MODE === 'true' || new URLSearchParams(location.search).get('validacao') === '1';
const localStateKey = `meg-financas-state-v4-paid-fixes${appEnvironmentSuffix}`;
const nativeMobileMode = import.meta.env.VITE_MOBILE_APP === 'true' || Boolean(window.Capacitor?.isNativePlatform?.());
document.body.classList.toggle('native-mobile', nativeMobileMode);
document.body.dataset.appEnvironment = appEnvironment;
const INACTIVITY_LIMIT_MS = 2 * 60 * 1000;
const INACTIVITY_WARNING_MS = 30 * 1000;
const INACTIVITY_MESSAGE_KEY = 'meg-inactivity-message';

const showSuccess = (title, message) => window.MEG_APP?.showToast?.(title, message, 'success');

function bootstrapValidationMode() {
  let savedState = null;
  try { savedState = JSON.parse(localStorage.getItem(localStateKey) || 'null'); } catch {}
  const validationUsersKey = `meg-validation-users-v1${appEnvironmentSuffix}`;
  const initialValidationUsers = [
    { id: 'validation-admin', name: 'MARCOS DE ANDRADE VILALVA', email: 'm_vilalva@hotmail.com', role: 'ADMIN', status: 'ACTIVE', isActive: true, createdAt: '2026-07-01T12:00:00.000Z', approvedAt: '2026-07-01T12:00:00.000Z', lastLoginAt: new Date().toISOString() },
    { id: 'validation-pending', name: 'USUÁRIO DE TESTE', email: 'usuario.teste@meg.local', role: 'VIEWER', status: 'PENDING', isActive: false, createdAt: new Date().toISOString(), approvedAt: null, lastLoginAt: null }
  ];
  let validationUsers;
  try { validationUsers = JSON.parse(localStorage.getItem(validationUsersKey) || 'null'); } catch {}
  if (!Array.isArray(validationUsers)) validationUsers = initialValidationUsers;
  const saveValidationUsers = () => localStorage.setItem(validationUsersKey, JSON.stringify(validationUsers));
  saveValidationUsers();
  window.MEG_REAL_STATE = savedState || { transactions: [], budgets: {} };
  window.MEG_CLOUD = {
    user: { name: 'VALIDAÇÃO LOCAL', role: 'ADMIN' },
    saveState(state) { localStorage.setItem(localStateKey, JSON.stringify(state)); },
    async saveNow(state) { localStorage.setItem(localStateKey, JSON.stringify(state)); },
    async reload() { location.reload(); },
    async logout() { localStorage.removeItem(localStateKey); location.reload(); },
    async previewNotifications() { throw new Error('Alertas externos ficam desativados no modo local.'); },
    async sendNotifications() { throw new Error('Alertas externos ficam desativados no modo local.'); },
    async listNotificationRecipients() { return []; },
    async addNotificationRecipient() { throw new Error('Destinatários ficam desativados no modo local.'); },
    async removeNotificationRecipient() {},
    async listNotificationEmailRecipients() { return []; },
    async addNotificationEmailRecipient() { throw new Error('E-mails ficam desativados no modo local.'); },
    async removeNotificationEmailRecipient() {},
    async listManagedUsers() { return { users: structuredClone(validationUsers) }; },
    async changeUserAccess(userId, payload) {
      validationUsers = validationUsers.map((user) => {
        if (user.id !== userId) return user;
        if (payload.action === 'APPROVE' || payload.action === 'ACTIVATE') return { ...user, role: payload.role || user.role, status: 'ACTIVE', isActive: true, approvedAt: new Date().toISOString() };
        if (payload.action === 'BLOCK') return { ...user, status: 'BLOCKED', isActive: false };
        if (payload.action === 'REJECT') return { ...user, status: 'REJECTED', isActive: false, rejectionNote: payload.note || null };
        return user;
      });
      saveValidationUsers();
      return { user: validationUsers.find((user) => user.id === userId) };
    },
    async resetUserPassword(userId) {
      const user = validationUsers.find((item) => item.id === userId);
      if (!user) throw new Error('Usuário não encontrado.');
      return { deliveredTo: `${user.email} (simulação local)` };
    }
  };
}

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
  return excelDateToIso(value);
}

async function parseMegWorkbook(file) {
    let workbookRows;
    try {
      workbookRows = await readSheet(file, 'LANÇAMENTOS');
    } catch {
      try {
        workbookRows = await readSheet(file, 2);
      } catch {
        throw new Error('A aba LANÇAMENTOS não foi encontrada na planilha.');
      }
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
  const emailRecipientNameInput = document.querySelector('#emailRecipientNameInput');
  const emailRecipientInput = document.querySelector('#emailRecipientInput');
  const addEmailRecipientButton = document.querySelector('#addEmailRecipientBtn');
  const emailRecipientList = document.querySelector('#notificationEmailRecipientList');
  const integrationForm = document.querySelector('#workspaceIntegrationForm');
  const workspaceEmailEnabled = document.querySelector('#workspaceEmailEnabled');
  const workspaceSenderName = document.querySelector('#workspaceSenderName');
  const workspaceReplyToEmail = document.querySelector('#workspaceReplyToEmail');
  const workspaceIntegrationStatus = document.querySelector('#workspaceIntegrationStatus');
  const testWorkspaceWhatsappBtn = document.querySelector('#testWorkspaceWhatsappBtn');
  if (userName) userName.textContent = window.MEG_CLOUD.user.name;
  logoutButton?.addEventListener('click', async () => {
    const confirmed = window.confirm('Deseja sair do MEG Finanças? Seus dados serão sincronizados antes de encerrar a sessão.');
    if (!confirmed) return;
    const originalText = logoutButton.textContent;
    logoutButton.disabled = true;
    logoutButton.textContent = 'Salvando...';
    const status = document.querySelector('#cloudSyncStatus');
    if (status) status.textContent = 'Salvando antes de sair...';
    try {
      await window.MEG_CLOUD.logout({ save: true });
    } catch (cause) {
      logoutButton.disabled = false;
      logoutButton.textContent = originalText;
      window.MEG_APP?.showToast?.(
        'Não foi possível sair com segurança',
        cause instanceof Error ? cause.message : 'Verifique sua conexão e tente novamente.',
        'error'
      );
    }
  });

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

  async function loadEmailRecipients() {
    if (!emailRecipientList) return;
    try {
      const recipients = await window.MEG_CLOUD.listNotificationEmailRecipients();
      emailRecipientList.innerHTML = recipients.length
        ? recipients.map((item) => `<label class="recipient-item"><input type="checkbox" value="${item.id}" data-notification-email checked /><span><strong>${escapeMarkup(item.name)}</strong><small>${escapeMarkup(item.email)}</small></span><button class="filter-clear-button" type="button" data-remove-email-recipient="${item.id}">Remover</button></label>`).join('')
        : '<span class="muted">Sem e-mails adicionais. O administrador padrão continuará recebendo.</span>';
    } catch (cause) {
      emailRecipientList.innerHTML = `<span class="muted">${escapeMarkup(cause instanceof Error ? cause.message : 'Falha ao carregar e-mails.')}</span>`;
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
      showSuccess("WhatsApp cadastrado", "O número foi adicionado aos destinatários.");
      await loadRecipients();
    } catch (cause) {
      notificationPreview.textContent = cause instanceof Error ? cause.message : 'Não foi possível adicionar o destinatário.';
    }
  });

  recipientList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-recipient]');
    if (!button) return;
    if (!window.confirm('Tem certeza de que deseja excluir este destinatario do WhatsApp?\n\nEle deixara de receber os alertas do MEG.')) return;
    await window.MEG_CLOUD.removeNotificationRecipient(button.dataset.removeRecipient);
    showSuccess("WhatsApp removido", "O número não receberá mais alertas.");
    await loadRecipients();
  });

  addEmailRecipientButton?.addEventListener('click', async () => {
    try {
      await window.MEG_CLOUD.addNotificationEmailRecipient(emailRecipientNameInput.value, emailRecipientInput.value);
      emailRecipientNameInput.value = '';
      emailRecipientInput.value = '';
      showSuccess("E-mail cadastrado", "O endereço foi adicionado aos destinatários.");
      await loadEmailRecipients();
    } catch (cause) {
      notificationPreview.textContent = cause instanceof Error ? cause.message : 'Não foi possível adicionar o e-mail.';
    }
  });

  emailRecipientList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-email-recipient]');
    if (!button) return;
    if (!window.confirm('Tem certeza de que deseja excluir este destinatario de e-mail?\n\nEle deixara de receber os alertas do MEG.')) return;
    await window.MEG_CLOUD.removeNotificationEmailRecipient(button.dataset.removeEmailRecipient);
    showSuccess("E-mail removido", "O endereço não receberá mais alertas.");
    await loadEmailRecipients();
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
      const emailRecipientIds = [...document.querySelectorAll('[data-notification-email]:checked')].map((item) => item.value);
      const result = await window.MEG_CLOUD.sendNotifications(recipientIds, emailRecipientIds);
      const delivery = (result.deliveries || []).map((item) => `${item.recipient || item.channel}: ${item.status}${item.detail ? ` — ${item.detail}` : ''}`).join('\n');
      notificationPreview.textContent = `${result.digest?.text || result.message || ''}\n\nResultado do envio:\n${delivery || 'Nenhum canal enviado.'}`;
    } catch (cause) {
      notificationPreview.textContent = cause instanceof Error ? cause.message : 'Falha ao enviar alertas.';
    }
  });

  loadRecipients();
  loadEmailRecipients();

  async function loadWorkspaceIntegrations() {
    if (!integrationForm || typeof window.MEG_CLOUD.getWorkspaceIntegrations !== 'function') return;
    try {
      const config = await window.MEG_CLOUD.getWorkspaceIntegrations();
      workspaceEmailEnabled.checked = config.emailEnabled !== false;
      workspaceSenderName.value = config.senderName || 'MEG Finanças';
      workspaceReplyToEmail.value = config.replyToEmail || '';
      workspaceIntegrationStatus.textContent = 'WhatsApp gerenciado ativo. Cadastre acima os números e e-mails que receberão os alertas.';
    } catch { integrationForm.closest('.panel')?.classList.add('hidden'); }
  }
  integrationForm?.addEventListener('submit', async (event) => {
    event.preventDefault(); workspaceIntegrationStatus.textContent = 'Salvando integrações...';
    try { await window.MEG_CLOUD.saveWorkspaceIntegrations({ whatsappEnabled: false, emailEnabled: workspaceEmailEnabled.checked, senderName: workspaceSenderName.value.trim(), replyToEmail: workspaceReplyToEmail.value.trim() }); workspaceIntegrationStatus.textContent = 'Preferências salvas. O WhatsApp gerenciado permanece ativo.'; showSuccess('Canais atualizados', 'Os alertas usarão o remetente oficial do MEG.'); await loadWorkspaceIntegrations(); }
    catch (cause) { workspaceIntegrationStatus.textContent = cause instanceof Error ? cause.message : 'Falha ao salvar integrações.'; }
  });
  testWorkspaceWhatsappBtn?.addEventListener('click', async () => {
    workspaceIntegrationStatus.textContent = 'Enviando mensagem de teste...';
    try { await window.MEG_CLOUD.testWorkspaceWhatsapp(); workspaceIntegrationStatus.textContent = 'Teste enviado pelo WhatsApp oficial do MEG ao administrador do espaço.'; }
    catch (cause) { workspaceIntegrationStatus.textContent = cause instanceof Error ? cause.message : 'Falha no teste.'; }
  });
  loadWorkspaceIntegrations();
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
      (validationMode ? 'A base ficará somente neste navegador para validação.' : 'A base atual na nuvem será substituída por esta planilha.')
    );
    if (!confirmation) {
      importStatus.textContent = 'Importação cancelada.';
      return;
    }
    window.MEG_APP.replaceImportedState(result.transactions, { cloud: false });
    await window.MEG_CLOUD.saveNow(window.MEG_APP.getState(), { force: true });
    importStatus.textContent = validationMode
      ? `${result.transactions.length} lançamentos importados somente no ambiente local. ${result.issues} linha(s) exigem revisão.`
      : `${result.transactions.length} lançamentos importados e salvos na nuvem. ${result.issues} linha(s) exigem revisão.`;
    showSuccess("Base importada", result.transactions.length + " lançamentos foram salvos com sucesso.");
  } catch (cause) {
    importStatus.textContent = cause instanceof Error ? cause.message : 'Não foi possível importar a planilha.';
  } finally {
    importInput.value = '';
  }
  });
}

function setupInactivityLogout() {
  if (validationMode) return;
  let warningTimer;
  let logoutTimer;
  const resetTimers = () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    warningTimer = window.setTimeout(() => {
      window.MEG_APP?.showToast?.(
        'Sessão perto de encerrar',
        'Por segurança, sua sessão será encerrada em 30 segundos se não houver atividade.',
        'warning'
      );
    }, INACTIVITY_LIMIT_MS - INACTIVITY_WARNING_MS);
    logoutTimer = window.setTimeout(async () => {
      sessionStorage.setItem(INACTIVITY_MESSAGE_KEY, 'Sua sessão foi encerrada após 2 minutos sem atividade.');
      try {
        await window.MEG_CLOUD.logout({ save: true });
      } catch {
        await window.MEG_CLOUD.logout({ save: false });
      }
    }, INACTIVITY_LIMIT_MS);
  };
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
    window.addEventListener(eventName, resetTimers, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resetTimers();
  });
  resetTimers();
}

async function start() {
  if (validationMode) bootstrapValidationMode();
  else await bootstrapCloud();
  window.MEG_NATIVE_NOTIFICATIONS = { sync: syncLocalDueNotifications };
  await import('./legacy-app.js');
  wireLegacyApp();
  window.MEG_APP_UPDATE = { check: () => checkForAppUpdate({ force: true }) };
  checkForAppUpdate();
  setupInactivityLogout();
  syncLocalDueNotifications(window.MEG_APP.getState());
  window.MEG_CLOUD?.whenFresh?.then((result) => {
    if (result?.changed && result.state) window.MEG_APP?.replaceState(result.state);
    if (result?.state) syncLocalDueNotifications(result.state);
  }).catch(() => undefined);
  if (validationMode) {
    document.body.insertAdjacentHTML('afterbegin', '<div class="validation-banner">AMBIENTE DE TESTES — dados isolados neste navegador, sem afetar o oficial</div>');
    const status = document.querySelector('#cloudSyncStatus');
    if (status) status.textContent = 'Dados somente neste navegador';
    const logout = document.querySelector('#logoutBtn');
    if (logout) logout.textContent = 'Limpar teste';
  }
}

start().catch((cause) => {
  const message = cause instanceof Error ? cause.message : 'Não foi possível iniciar o MEG.';
  document.body.insertAdjacentHTML('beforeend', `<div class="fatal-error"><strong>Não foi possível abrir o MEG</strong><span>${message}</span><button onclick="location.reload()">Tentar novamente</button></div>`);
});
