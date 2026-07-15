export function installmentDueDate(firstDate, offset) {
  const [year, month, day] = firstDate.split('-').map(Number);
  const targetMonth = month - 1 + offset;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay)));
  const weekday = date.getUTCDay();
  if (weekday === 6) date.setUTCDate(date.getUTCDate() + 2);
  if (weekday === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function dateAtDay(year, monthIndex, day) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
}

function nextBusinessDay(date) {
  const adjusted = new Date(date);
  if (adjusted.getUTCDay() === 6) adjusted.setUTCDate(adjusted.getUTCDate() + 2);
  if (adjusted.getUTCDay() === 0) adjusted.setUTCDate(adjusted.getUTCDate() + 1);
  return adjusted;
}

export function cardStatementDueDate(purchaseDate, closingDay, dueDay) {
  const [year, month, day] = String(purchaseDate).split('-').map(Number);
  const closing = Number(closingDay);
  const due = Number(dueDay);
  if (!year || !month || !day || closing < 1 || closing > 31 || due < 1 || due > 31) {
    throw new Error('Revise a data da compra, o fechamento e o vencimento do cartão.');
  }

  let closingMonth = month - 1;
  const purchase = new Date(Date.UTC(year, month - 1, day));
  const currentClosing = dateAtDay(year, closingMonth, closing);
  if (purchase > currentClosing) closingMonth += 1;

  const closingYear = year + Math.floor(closingMonth / 12);
  const normalizedClosingMonth = ((closingMonth % 12) + 12) % 12;
  const dueMonthOffset = due > closing ? 0 : 1;
  const rawDueMonth = normalizedClosingMonth + dueMonthOffset;
  const dueYear = closingYear + Math.floor(rawDueMonth / 12);
  const dueMonth = rawDueMonth % 12;
  return nextBusinessDay(dateAtDay(dueYear, dueMonth, due)).toISOString().slice(0, 10);
}

export function splitInstallmentAmounts(total, count) {
  const totalCents = Math.round(Number(total || 0) * 100);
  const installments = Math.max(Number.parseInt(String(count || 1), 10), 1);
  if (!totalCents || installments < 1) throw new Error('Informe o valor total da compra e a quantidade de parcelas.');
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents - baseCents * installments;
  return Array.from({ length: installments }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100);
}
