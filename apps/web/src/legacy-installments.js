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

export function splitInstallmentAmounts(total, count) {
  const totalCents = Math.round(Number(total || 0) * 100);
  const installments = Math.max(Number.parseInt(String(count || 1), 10), 1);
  if (!totalCents || installments < 1) throw new Error('Informe o valor total da compra e a quantidade de parcelas.');
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents - baseCents * installments;
  return Array.from({ length: installments }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100);
}
