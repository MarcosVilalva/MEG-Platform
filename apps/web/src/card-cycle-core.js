function validDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

export function calculateBestPurchaseDay(closingDay) {
  const closing = validDay(closingDay);
  if (!closing) return null;
  return closing === 31 ? 1 : closing + 1;
}

function dateAtDay(year, month, day) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function calculateCardPurchaseCycle({ purchaseDate, closingDay, dueDay }) {
  const closing = validDay(closingDay);
  const due = validDay(dueDay);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(purchaseDate || ''));
  if (!closing || !due || !match) return null;
  const purchase = dateAtDay(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let invoiceClosing = dateAtDay(purchase.getUTCFullYear(), purchase.getUTCMonth(), closing);
  if (purchase > invoiceClosing) invoiceClosing = dateAtDay(purchase.getUTCFullYear(), purchase.getUTCMonth() + 1, closing);
  const dueMonthOffset = due > invoiceClosing.getUTCDate() ? 0 : 1;
  const invoiceDue = dateAtDay(invoiceClosing.getUTCFullYear(), invoiceClosing.getUTCMonth() + dueMonthOffset, due);
  const iso = (date) => date.toISOString().slice(0, 10);
  return {
    bestPurchaseDay: calculateBestPurchaseDay(closing),
    closingDate: iso(invoiceClosing),
    dueDate: iso(invoiceDue),
    isClosingDay: iso(purchase) === iso(invoiceClosing),
  };
}
