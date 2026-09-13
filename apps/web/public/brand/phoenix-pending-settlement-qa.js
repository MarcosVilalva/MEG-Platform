(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('pendingTest') !== 'claro-marcos') return;

  const SESSION_KEY = 'meg.auth.session';
  const EVENT_ID = 'cmtz5thym02s0gm2flv0p6oyk';
  const ACCOUNT_ID = 'account-monetary-main';
  const PAYMENT_METHOD_ID = 'cmrfcn1ja003tv2tkqychzkop';
  const OPERATION_KEY = `meg.phoenix.pending-settlement.operation.${EVENT_ID}`;
  const EXPECTED = {
    description: 'CLARO MARCOS',
    amount: 30.90,
    dueDate: '2026-09-10',
    accountName: 'Conta monetaria principal',
    paymentMethodName: 'BOLETO'
  };
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

  function todaySaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const read = (type) => parts.find((item) => item.type === type)?.value || '';
    return `${read('year')}-${read('month')}-${read('day')}`;
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
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
    if (!response.ok) {
      const error = new Error(payload?.error || `HTTP_${response.status}`);
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
  }

  function operationId() {
    const existing = sessionStorage.getItem(OPERATION_KEY);
    if (existing) return existing;
    const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const value = `phoenix-claro-marcos-${uuid}`.slice(0, 120);
    sessionStorage.setItem(OPERATION_KEY, value);
    return value;
  }

  function formatDay(iso) {
    return date.format(new Date(`${iso}T12:00:00Z`));
  }

  function mount() {
    const panel = document.createElement('section');
    panel.id = 'meg-phoenix-pending-qa';
    panel.innerHTML = `
      <style>
        #meg-phoenix-pending-qa{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(440px,calc(100vw - 24px));background:#0d2133;color:#f5f9fc;border:1px solid rgba(255,255,255,.14);border-radius:18px;box-shadow:0 22px 60px rgba(0,0,0,.42);font-family:Inter,system-ui,sans-serif;overflow:hidden}
        #meg-phoenix-pending-qa *{box-sizing:border-box}
        #meg-phoenix-pending-qa header{padding:16px 18px 12px;background:linear-gradient(135deg,#12314a,#0d2133);border-bottom:1px solid rgba(255,255,255,.08)}
        #meg-phoenix-pending-qa h3{margin:0;font-size:16px}#meg-phoenix-pending-qa p{margin:6px 0 0;color:#b8c9d7;font-size:12px;line-height:1.45}
        #meg-phoenix-pending-qa .qa-body{padding:14px 18px 18px;display:grid;gap:10px}
        #meg-phoenix-pending-qa .qa-status{padding:11px 12px;border-radius:12px;background:rgba(255,255,255,.06);font-size:12px;line-height:1.55;white-space:pre-wrap;max-height:230px;overflow:auto}
        #meg-phoenix-pending-qa .qa-actions{display:flex;gap:8px;flex-wrap:wrap}
        #meg-phoenix-pending-qa button{appearance:none;border:0;border-radius:11px;padding:10px 12px;font-weight:700;cursor:pointer;background:#2bb673;color:#06190f}
        #meg-phoenix-pending-qa button.secondary{background:rgba(255,255,255,.10);color:#f5f9fc}
        #meg-phoenix-pending-qa button:disabled{opacity:.45;cursor:not-allowed}
        #meg-phoenix-pending-qa .qa-warn{color:#ffd48a}.qa-ok{color:#7be0ad}.qa-danger{color:#ff9f9f}
      </style>
      <header>
        <h3>Homologação · Baixa real de Pendentes</h3>
        <p>Teste autorizado exclusivamente para CLARO MARCOS, ${money.format(EXPECTED.amount)}, vencimento ${formatDay(EXPECTED.dueDate)}. Esta operação é real e não será apagada depois.</p>
      </header>
      <div class="qa-body">
        <div class="qa-status" data-status>Pronto para verificar o compromisso e o gate protegido.</div>
        <div class="qa-actions">
          <button type="button" data-check>Verificar ambiente</button>
          <button type="button" data-run disabled>Baixar CLARO MARCOS</button>
          <button type="button" class="secondary" data-close>Fechar</button>
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
      setStatus('Verificando sessão, gate, lançamento, conta e forma de pagamento…');
      try {
        const session = readSession();
        if (!session) throw new Error('PHOENIX_QA_SESSION_REQUIRED');
        if (!['ADMIN', 'MANAGER', 'OPERATOR'].includes(session.user?.role)) throw new Error('PHOENIX_QA_WRITE_ROLE_REQUIRED');
        const [health, events, accounts, methods] = await Promise.all([
          fetch('/preview-health', { cache: 'no-store' }).then((response) => response.json()),
          api('/finance/events?page=1&pageSize=100&search=CLARO%20MARCOS'),
          api('/finance/accounts'),
          api('/finance/payment-methods')
        ]);
        if (!health?.capabilities?.pendingSettlementWrite) throw new Error('PHOENIX_QA_PENDING_SETTLEMENT_GATE_DISABLED');
        const event = Array.isArray(events?.items) ? events.items.find((item) => item.id === EVENT_ID) : null;
        if (!event) throw new Error('PHOENIX_QA_EVENT_NOT_FOUND');
        if (normalize(event.description) !== EXPECTED.description || Math.abs(Number(event.amount) - EXPECTED.amount) > 0.001) throw new Error('PHOENIX_QA_EVENT_MISMATCH');
        if (String(event.date).slice(0, 10) !== EXPECTED.dueDate) throw new Error('PHOENIX_QA_DUE_DATE_MISMATCH');
        if (event.status === 'paid') {
          setStatus(`CLARO MARCOS já consta como pago.\nEvento: ${event.id}\nData realizada: ${formatDay(String(event.date).slice(0,10))}\n\nO teste não será repetido.`, 'qa-ok');
          return;
        }
        if (event.status !== 'planned' || event.type !== 'expense' || Number(event.signedAmount) >= 0) throw new Error('PHOENIX_QA_EVENT_NOT_PENDING');
        const account = Array.isArray(accounts) ? accounts.find((item) => item.id === ACCOUNT_ID && item.isActive && item.type !== 'benefit') : null;
        const method = Array.isArray(methods) ? methods.find((item) => item.id === PAYMENT_METHOD_ID && item.isActive && normalize(item.name) === EXPECTED.paymentMethodName) : null;
        if (!account) throw new Error('PHOENIX_QA_ACCOUNT_NOT_READY');
        if (!method) throw new Error('PHOENIX_QA_PAYMENT_METHOD_NOT_READY');
        context = { event, account, method };
        const paidAt = todaySaoPaulo();
        setStatus(
          `Ambiente pronto.\nCompromisso: ${event.description}\nValor: ${money.format(Number(event.amount))}\nVencimento original: ${formatDay(EXPECTED.dueDate)}\nData da baixa: ${formatDay(paidAt)}\nConta: ${account.name}\nForma: ${method.name}\n\nA confirmação abaixo altera a base real.`,
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
      const paidAt = todaySaoPaulo();
      const confirmed = window.confirm(
        `CONFIRMAR BAIXA REAL\n\nCLARO MARCOS\nValor: ${money.format(EXPECTED.amount)}\nVencimento original: ${formatDay(EXPECTED.dueDate)}\nData da baixa: ${formatDay(paidAt)}\nConta: ${context.account.name}\nForma: ${context.method.name}\n\nEsta operação será mantida na base. Deseja confirmar?`
      );
      if (!confirmed) return;

      runButton.disabled = true;
      checkButton.disabled = true;
      setStatus('Registrando a baixa protegida…');
      const opId = operationId();
      const payload = { paidAt, accountId: ACCOUNT_ID, paymentMethodId: PAYMENT_METHOD_ID, operationId: opId };
      try {
        const result = await api(`/finance/events/${EVENT_ID}/settle`, { method: 'POST', body: JSON.stringify(payload) });
        if (result?.event?.id !== EVENT_ID || result?.event?.status !== 'paid') throw new Error('PHOENIX_QA_SETTLEMENT_RESPONSE_INVALID');
        if (!Array.isArray(result.event.ledgerEntries) || result.event.ledgerEntries.length !== 1) throw new Error('PHOENIX_QA_LEDGER_INVALID');
        const entry = result.event.ledgerEntries[0];
        if (Math.abs(Number(entry.credit) - EXPECTED.amount) > 0.001 || Number(entry.debit) !== 0) throw new Error('PHOENIX_QA_LEDGER_AMOUNT_INVALID');
        if (result.originalDueDate !== EXPECTED.dueDate) throw new Error('PHOENIX_QA_ORIGINAL_DUE_DATE_NOT_PRESERVED');

        const replay = await api(`/finance/events/${EVENT_ID}/settle`, { method: 'POST', body: JSON.stringify(payload) });
        if (replay?.event?.id !== EVENT_ID || replay?.idempotentReplay !== true) throw new Error('PHOENIX_QA_IDEMPOTENCY_FAILED');

        const audit = await api('/finance/audit?page=1&pageSize=100&action=FINANCIAL_EVENT_SETTLED_COMPAT&entity=FinancialEvent');
        const auditItems = Array.isArray(audit?.items) ? audit.items : [];
        if (!auditItems.some((item) => item.entityId === EVENT_ID)) throw new Error('PHOENIX_QA_AUDIT_NOT_FOUND');

        sessionStorage.setItem(`meg.phoenix.pending-settlement.report.${EVENT_ID}`, JSON.stringify({
          eventId: EVENT_ID,
          operationId: opId,
          originalDueDate: result.originalDueDate,
          paidAt,
          amount: EXPECTED.amount,
          accountId: ACCOUNT_ID,
          paymentMethodId: PAYMENT_METHOD_ID,
          idempotentReplay: true,
          auditConfirmed: true,
          ledgerConfirmed: true,
          completedAt: new Date().toISOString()
        }));
        window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: `/finance/events/${EVENT_ID}/settle`, method: 'POST' } }));
        setStatus(
          `BAIXA CONCLUÍDA.\nCLARO MARCOS: ${money.format(EXPECTED.amount)}\nStatus: PAGO\nVencimento preservado: ${formatDay(EXPECTED.dueDate)}\nBaixa em: ${formatDay(paidAt)}\nForma: ${context.method.name}\nLedger: OK\nIdempotência: OK\nAuditoria: OK\n\nO registro é real e foi mantido na base.`,
          'qa-ok'
        );
        context = null;
      } catch (error) {
        setStatus(`Falha na baixa protegida.\n${error instanceof Error ? error.message : String(error)}\n\nNão será feita nova tentativa automática.`, 'qa-danger');
      } finally {
        checkButton.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
