const brlNumber = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function normalizeMoneyDigits(value) {
  return String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function digitsToBRL(digits, { negative = false } = {}) {
  const normalized = normalizeMoneyDigits(digits);
  if (!normalized) return '';
  const cents = Number(normalized);
  if (!Number.isFinite(cents)) return '';
  const value = cents / 100;
  const formatted = brlNumber.format(value);
  return negative && value > 0 ? `-${formatted}` : formatted;
}

export function parseBRL(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-') return Number.NaN;
  const negative = raw.includes('-');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return Number.NaN;
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return Number.NaN;
  return (negative ? -1 : 1) * (cents / 100);
}

function numericValue(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return Number.NaN;
  if (raw.includes(',')) return parseBRL(raw);
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return parseBRL(raw);
}

export function formatBRLValue(value) {
  const numeric = numericValue(value);
  if (!Number.isFinite(numeric)) return '';
  const formatted = brlNumber.format(Math.abs(numeric));
  return numeric < 0 ? `-${formatted}` : formatted;
}

export function formatBRLInput(value, { allowNegative = false } = {}) {
  const raw = String(value ?? '');
  // Teclados virtuais podem inserir o sinal no fim ou no meio do valor
  // formatado. Reconhecer o sinal em qualquer posição evita que o Android
  // transforme um estorno negativo em lançamento positivo.
  const negative = allowNegative && raw.includes('-');
  const digits = normalizeMoneyDigits(raw);
  if (!digits) return negative ? '-' : '';
  return digitsToBRL(digits, { negative });
}

export function formatPastedBRL(value, { allowNegative = false } = {}) {
  const raw = String(value ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!raw) return '';
  const negative = allowNegative && raw.includes('-');
  const unsigned = raw.replace(/-/g, '');
  let numeric;

  if (unsigned.includes(',')) {
    numeric = parseBRL(`${negative ? '-' : ''}${unsigned}`);
  } else if (/^\d+(?:\.\d{1,2})?$/.test(unsigned)) {
    numeric = Number(unsigned) * (negative ? -1 : 1);
  } else {
    const digits = normalizeMoneyDigits(unsigned);
    numeric = digits ? Number(digits) / 100 * (negative ? -1 : 1) : Number.NaN;
  }

  return formatBRLValue(numeric);
}

export function brlToCanonical(value) {
  const numeric = parseBRL(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '';
}
