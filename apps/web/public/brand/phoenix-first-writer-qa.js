(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('writerTest') !== '1') return;

  const SESSION_KEY = 'meg.auth.session';
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function todaySaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const read = (type) => parts.find((item) => item.type === type)?.value || '';
    return `${read('year')}-${read('month')}-${read('day')}`;
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  function readSession() {
    try {
      const value = sessionStorage.getItem(SESSION_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async function api(path, init = {}) {
    const session = readSession();
    if (!session?.accessToken) throw new Error('PHOENIX_QA_SESSION_REQUIRED');
    const response = await fetch(path, {
      ...init,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        ...(init.headers || {})
      }
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP_${response.status}`);
    return payload;
  }

  function activeMonetaryAccount(accounts) {
    return accounts.find((item) => item.isActive && item.type !== 'benefit' && !/(BENEF|VEROCARD|ALIMENTA)/.test(normalize(item.name)));
  }

  function activeExpenseCategory(categories) {
    return categories.find((item) => item.isActive && (!item.type || item.type === 'expense'));
  }

  function activePix(methods) {
    return methods.find((item) => item.isActive && normalize(item.name) === 'PIX');
  }

  function id(prefix) {
    const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    return `${prefix}-${uuid}`.slice(0, 120);
  }

  function mount() {
    const panel = document.createElement('section');
    panel.id = 'meg-phoenix-writer-qa';
    panel.innerHTML = `
      <style>
        #meg-phoenix-writer-qa{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(420px,calc(100vw - 24px));background:#0d2133;color:#f5f9fc;border:1px solid rgba(255,255,255,.14);border-radius:18px;box-shadow:0 22px 60px rgba(0,0,0,.42);font-family:Inter,system-ui,sans-serif;overflow:hidden}
        #meg-phoenix-writer-qa *{box-sizing:border-box}
        #meg-phoenix-writer-qa header{padding:16px 18px 12px;background:linear-gradient(135deg,#12314a,#0d2133);border-bottom:1px solid rgba(255,255,255,.08)}
        #meg-phoenix-writer-qa h3{margin:0;font-size:16px}#meg-phoenix-writer-qa p{margin:6px 0 0;color:#b8c9d7;font-size:12px;line-height:1.45}
        #meg-phoenix-writer-qa .qa-body{padding:14px 18px 18px;display:grid;gap:10px}
        #meg-phoenix-writer-qa .qa-status{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);font-size:12px;line-height:1.5;white-space:pre-wrap;max-height:180px;overflow:auto}
        #meg-phoenix-writer-qa .qa-actions{display:flex;gap:8px;flex-wrap:wrap}
        #meg-phoenix-writer-qa button{appearance:none;border:0;border-radius:11px;padding:10px 12px;font-weight:700;cursor:pointer;background:#2bb673;color:#06190f}
        #meg-phoenix-writer-qa button.secondary{background:rgba(255,255,255,.10);color:#f5f9fc}
        #meg-phoenix-writer-qa button:disabled{opacity:.45;cursor:not-allowed}
        #meg-phoenix-writer-qa .qa-warn{color:#ffd48a}.qa-ok{color:#7be0ad}
      </style>
      <header>
        <h3>Homologação · Primeiro writer</h3>
        <p>Somente neste modo QA. O teste cria uma entrada e uma saída de ${money.format(0.01)} na mesma conta, deixando efeito líquido de saldo igual a zero.</p>
      </header>
      <div class="qa-body">
        <div class="qa-status" data-status>Pronto para verificar o ambiente.</div>
        <div class="qa-actions">
          <button type="button" data-check>Verificar ambiente</button>
          <button type="button" data-run disabled>Executar teste controlado</button>
          <button type="button" class="secondary" data-close>Fechar QA</button>
        </div>
      </div>`;
    document.body.appendChild(panel);

    const status = panel.querySelector('[data-status]');
    const checkButton = panel.querySelector('[data-check]');
    const runButton = panel.querySelector('[data-run]');
    const closeButton = panel.querySelector('[data-close]');
    let context = null;

    const setStatus = (message, className = '') => {
      status.className = `qa-status ${className}`.trim();
      status.textContent = message;
    };

    closeButton.addEventListener('click', () => panel.remove());

    checkButton.addEventListener('click', async () => {
      checkButton.disabled = true;
      runButton.disabled = true;
      setStatus('Verificando sessão, conta, categoria e formas de recebimento…');
      try {
        const session = readSession();
        if (!session) throw new Error('PHOENIX_QA_SESSION_REQUIRED');
        if (!['ADMIN', 'MANAGER', 'OPERATOR'].includes(session.user?.role)) throw new Error('PHOENIX_QA_WRITE_ROLE_REQUIRED');
        const [accounts, categories, methods] = await Promise.all([
          api('/finance/accounts'),
          api('/finance/categories'),
          api('/finance/payment-methods')
        ]);
        const account = activeMonetaryAccount(accounts);
        const category = activeExpenseCategory(categories);
        const pix = activePix(methods);
        const requiredIncomeNames = ['PIX', 'DINHEIRO', 'DEPOSITO BANCARIO'];
        const availableIncomeNames = new Set(methods.filter((item) => item.isActive).map((item) => normalize(item.name)));
        const missing = requiredIncomeNames.filter((name) => !availableIncomeNames.has(name));
        if (!account) throw new Error('PHOENIX_QA_ACCOUNT_REQUIRED');
        if (!category) throw new Error('PHOENIX_QA_EXPENSE_CATEGORY_REQUIRED');
        if (!pix) throw new Error('PHOENIX_QA_PIX_REQUIRED');
        if (missing.length) throw new Error(`PHOENIX_QA_INCOME_METHODS_MISSING:${missing.join(',')}`);
        context = { account, category, pix, user: session.user };
        setStatus(
          `Ambiente pronto.\nUsuário: ${session.user?.name || session.user?.email || '—'}\nConta: ${account.name}\nCategoria de saída: ${category.name}\nForma: ${pix.name}\nRecebimentos homologados: PIX, DINHEIRO e DEPÓSITO BANCÁRIO.`,
          'qa-ok'
        );
        runButton.disabled = false;
      } catch (error) {
        const code = error instanceof Error ? error.message : String(error);
        const friendly = code === 'PHOENIX_QA_SESSION_REQUIRED'
          ? 'Faça login neste mesmo preview e execute a verificação novamente.'
          : code;
        setStatus(`Ambiente não liberado.\n${friendly}`, 'qa-warn');
      } finally {
        checkButton.disabled = false;
      }
    });

    runButton.addEventListener('click', async () => {
      if (!context) return;
      if (!window.confirm('Executar o teste real controlado? Serão criados 2 lançamentos de R$ 0,01 na mesma conta, um de entrada e outro de saída, com efeito líquido de saldo igual a zero.')) return;
      runButton.disabled = true;
      checkButton.disabled = true;
      setStatus('Executando o primeiro writer real…');
      try {
        const day = todaySaoPaulo();
        const base = id('phoenix-qa');
        const common = {
          status: 'paid',
          date: day,
          amount: 0.01,
          accountId: context.account.id,
          paymentMethodId: context.pix.id,
          notes: `[QA PHOENIX FIRST WRITER] ${base}`
        };
        const incomeOperationId = `${base}-income`;
        const expenseOperationId = `${base}-expense`;
        const incomePayload = {
          ...common,
          description: 'QA PHOENIX WRITER +0,01',
          type: 'income',
          operationId: incomeOperationId
        };
        const income = await api('/finance/events', { method: 'POST', body: JSON.stringify(incomePayload) });
        const replay = await api('/finance/events', { method: 'POST', body: JSON.stringify(incomePayload) });
        if (replay.id !== income.id || replay.idempotentReplay !== true) throw new Error('PHOENIX_QA_IDEMPOTENCY_FAILED');
        if (!Array.isArray(income.ledgerEntries) || income.ledgerEntries.length !== 1) throw new Error('PHOENIX_QA_INCOME_LEDGER_FAILED');

        const expense = await api('/finance/events', {
          method: 'POST',
          body: JSON.stringify({
            ...common,
            description: 'QA PHOENIX WRITER -0,01',
            type: 'expense',
            categoryId: context.category.id,
            operationId: expenseOperationId
          })
        });
        if (!Array.isArray(expense.ledgerEntries) || expense.ledgerEntries.length !== 1) throw new Error('PHOENIX_QA_EXPENSE_LEDGER_FAILED');

        const audit = await api('/finance/audit?page=1&pageSize=100&action=FINANCIAL_EVENT_CREATED&entity=FinancialEvent');
        const auditItems = Array.isArray(audit?.items) ? audit.items : [];
        const auditedIds = new Set(auditItems.map((item) => item.entityId));
        if (!auditedIds.has(income.id) || !auditedIds.has(expense.id)) throw new Error('PHOENIX_QA_AUDIT_NOT_FOUND');

        const events = await api('/finance/events?page=1&pageSize=100&search=QA%20PHOENIX%20WRITER');
        const eventItems = Array.isArray(events?.items) ? events.items : [];
        if (!eventItems.some((item) => item.id === income.id) || !eventItems.some((item) => item.id === expense.id)) {
          throw new Error('PHOENIX_QA_READ_AFTER_WRITE_FAILED');
        }

        const report = {
          completedAt: new Date().toISOString(),
          base,
          accountId: context.account.id,
          accountName: context.account.name,
          incomeEventId: income.id,
          expenseEventId: expense.id,
          incomeOperationId,
          expenseOperationId,
          incomeLedgerEntries: income.ledgerEntries.length,
          expenseLedgerEntries: expense.ledgerEntries.length,
          idempotentReplay: replay.idempotentReplay === true,
          auditConfirmed: true,
          readAfterWriteConfirmed: true,
          netEffect: 0
        };
        sessionStorage.setItem('meg.phoenix.first-writer.qa.report', JSON.stringify(report));
        window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/finance/events', method: 'POST' } }));
        setStatus(
          `TESTE CONCLUÍDO.\nEntrada: ${income.id}\nSaída: ${expense.id}\nIdempotência: OK\nLedger: 1 + 1 entrada(s)\nAuditoria: OK\nLeitura após gravação: OK\nEfeito líquido na conta: ${money.format(0)}\n\nOs 2 registros QA permanecem identificados para limpeza controlada posterior.`,
          'qa-ok'
        );
      } catch (error) {
        setStatus(`Falha no teste controlado.\n${error instanceof Error ? error.message : String(error)}\n\nNenhuma nova tentativa automática será feita.`, 'qa-warn');
      } finally {
        checkButton.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
