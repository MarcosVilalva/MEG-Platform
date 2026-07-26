const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function parseMoney(value) {
  const match = String(value || '').match(/-?R\$\s?[\d.]+,\d{2}/)?.[0];
  if (!match) return 0;
  const negative = match.trim().startsWith('-');
  const parsed = Number(match.replace('-', '').replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  return negative ? -parsed : parsed;
}

function currentMonetaryBalance() {
  // Fonte oficial: painel Monetário. Benefícios, cartões de alimentação e valores consolidados não entram.
  return parseMoney(document.querySelector('#monetarySituationMetric')?.textContent);
}

function currentOpenTotal() {
  return parseMoney(document.querySelector('#pendingTotalMetric')?.textContent)
    || parseMoney(document.querySelector('#megPendingOpenValue')?.textContent);
}

function render() {
  const hero = document.querySelector('#megPendingDecisionHero');
  if (!hero) return;
  const available = currentMonetaryBalance();
  const open = currentOpenTotal();
  const projected = available - open;
  const safe = projected >= 0;
  const set = (id, value) => {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  };

  set('megPendingAvailable', money.format(available));
  set('megPendingOpen', money.format(open));
  set('megPendingProjected', money.format(projected));
  set('megPendingBalance', money.format(Math.abs(projected)));
  set('megPendingDecisionTitle', safe ? 'Você consegue pagar todas as contas' : 'O saldo monetário não cobre todas as contas');
  set('megPendingDecisionMessage', safe
    ? `O saldo monetário atual cobre ${money.format(open)} em compromissos abertos.`
    : `Faltam ${money.format(Math.abs(projected))} no saldo monetário para quitar os compromissos.`);
  set('megPendingBalanceNote', safe
    ? 'Saldo monetário que restará depois dos pagamentos'
    : 'Valor monetário necessário para quitar tudo');

  const label = document.querySelector('#megPendingBalanceCard > span');
  if (label) label.textContent = safe ? 'Sobra monetária projetada' : 'Falta no saldo monetário';
  hero.classList.toggle('healthy', safe);
  hero.classList.toggle('risk', !safe);
  hero.dataset.balanceSource = 'monetary-current';

  const oldCoverage = document.querySelector('#pendingCoverageMetric');
  if (oldCoverage) {
    const pct = open <= 0 ? 100 : Math.min(Math.max((available / open) * 100, 0), 100);
    oldCoverage.textContent = `${pct.toFixed(0)}%`;
  }
  const trend = document.querySelector('#pendingCoverageTrend');
  if (trend) trend.textContent = `${money.format(available)} monetários para ${money.format(open)} em aberto`;
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    render();
  });
}

function start() {
  render();
  ['monetarySituationMetric', 'pendingTotalMetric', 'megPendingDecisionHero', 'pendingBillsList'].forEach((id) => {
    const target = document.querySelector(`#${id}`);
    if (target) new MutationObserver(schedule).observe(target, { childList: true, subtree: true, characterData: true });
  });
  ['pendingMonthFilter', 'pendingStatusFilter', 'pendingPaymentFilter', 'monthFilter', 'periodMode'].forEach((id) => {
    document.querySelector(`#${id}`)?.addEventListener('change', schedule);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
