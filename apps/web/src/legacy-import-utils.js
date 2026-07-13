export function excelDateToIso(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) return `${brazilian[3]}-${brazilian[2].padStart(2, '0')}-${brazilian[1].padStart(2, '0')}`;
  const date = new Date(text);
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString().slice(0, 10);
}
