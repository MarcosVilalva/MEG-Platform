const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

export function transactionIconKind(item = {}) {
  const type = normalize(item.type || item.launchType);
  const haystack = normalize([
    item.description,
    item.group,
    item.category,
    item.expenseClass,
  ].join(' '));
  if (type.includes('INCOME') || type.includes('RECEITA')) return 'income';
  if (/MERCADO|SUPERMERCADO|HORTI|FEIRA/.test(haystack)) return 'market';
  if (/SAUDE|FARMAC|MEDIC|DENT|CLINIC|HOSPITAL/.test(haystack)) return 'health';
  if (/CASA|MORADIA|ALUGUEL|CONDOMINIO|ENERGIA|AGUA|GAS/.test(haystack)) return 'home';
  if (/CARRO|VEICULO|COMBUST|GASOLINA|OFICINA|TRANSPORTE|UBER/.test(haystack)) return 'vehicle';
  if (/TELEF|CELULAR|INTERNET|COMUNICAC/.test(haystack)) return 'communication';
  if (/ESCOLA|FACULDADE|CURSO|EDUCAC|LIVRO/.test(haystack)) return 'education';
  if (/PET|VETERIN|RACAO/.test(haystack)) return 'pet';
  if (/ROUPA|CALCADO|VESTUARIO/.test(haystack)) return 'clothing';
  if (/RESTAUR|LANCHE|ALIMENT|PADARIA|IFOOD/.test(haystack)) return 'food';
  if (/LAZER|CINEMA|VIAGEM|ASSINATURA|STREAM/.test(haystack)) return 'leisure';
  return 'expense';
}

const ICON_PATHS = {
  income: '<path d="M5 19h14v2H5v-2Zm1-4h3V8H6v7Zm5 0h3V4h-3v11Zm5 0h3v-5h-3v5ZM4 6l5-4 4 3 6-4 1 1.7-7 4.7-4-3L5.2 7.5 4 6Z"/>',
  market: '<path d="M6 5h15l-2 8H8L6 4H3V2h4l.5 2H21v1ZM9 15h9v2H9v-2Zm1 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/>',
  health: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Zm2 2v6H5v2h6v6h2v-6h6v-2h-6V5h-2Z"/>',
  home: '<path d="m12 3 9 8h-3v10h-5v-6h-2v6H6V11H3l9-8Zm0 2.7L7.5 10v9H9v-6h6v6h1.5v-9L12 5.7Z"/>',
  vehicle: '<path d="m5 6 2-3h10l2 3 2 2v9h-2v2h-3v-2H8v2H5v-2H3V8l2-2Zm2.1-1L5.8 7h12.4l-1.3-2H7.1ZM5 9v6h14V9H5Zm2 1h3v2H7v-2Zm7 0h3v2h-3v-2Z"/>',
  communication: '<path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 3v13h10V5H7Zm4 14h2v1h-2v-1Z"/>',
  education: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-6 8 6 3 6-3v5c-3 3-9 3-12 0v-5Zm14-1h2v7h-2v-7Z"/>',
  pet: '<path d="M8 11c2-2 6-2 8 0 2 2 3 5 1 7-2 2-4 0-5 0s-3 2-5 0c-2-2-1-5 1-7ZM6 5a2 3 0 1 1 0 6 2 3 0 0 1 0-6Zm12 0a2 3 0 1 1 0 6 2 3 0 0 1 0-6ZM10 2a2 3 0 1 1 0 6 2 3 0 0 1 0-6Zm4 0a2 3 0 1 1 0 6 2 3 0 0 1 0-6Z"/>',
  clothing: '<path d="M8 3h3c0 2 2 2 2 0h3l5 4-3 4-2-1v11H8V10l-2 1-3-4 5-4Zm1 2L6 7.4l.6.8L10 7v12h4V7l3.4 1.2.6-.8L15 5c-1.4 2-4.6 2-6 0Z"/>',
  food: '<path d="M5 2h2v8h2V2h2v8c0 2-1 3-3 3v9H6v-9c-2 0-3-1-3-3V2h2v6h1V2Zm11 0c3 2 4 5 4 9v3h-2v8h-2V2Z"/>',
  leisure: '<path d="M7 5h10l4 6v7a3 3 0 0 1-5 2l-2-2h-4l-2 2a3 3 0 0 1-5-2v-7l4-6Zm1 2-3 5v6c0 1 1 1 2 .4l2.2-2.4h5.6l2.2 2.4c1 .6 2 .6 2-.4v-6l-3-5H8Zm0 4h2V9h2v2h2v2h-2v2h-2v-2H8v-2Zm8 0h2v2h-2v-2Z"/>',
  expense: '<path d="M6 2h12a2 2 0 0 1 2 2v18l-4-2-4 2-4-2-4 2V4a2 2 0 0 1 2-2Zm1 5v2h10V7H7Zm0 4v2h10v-2H7Zm0 4v2h7v-2H7Z"/>',
};

export function transactionIconMarkup(kind) {
  const safeKind = ICON_PATHS[kind] ? kind : 'expense';
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${ICON_PATHS[safeKind]}</svg>`;
}

export function applyBatchTransactionChanges(transactions, { ids = [], date = '', paymentMethod = '', resolveModality = () => '' } = {}) {
  const selected = new Set(ids.map(String).filter(Boolean));
  let changed = 0;
  const nextTransactions = transactions.map((item) => {
    if (!selected.has(String(item.id))) return item;
    const next = { ...item };
    let itemChanged = false;
    if (date && next.date !== date) {
      next.date = date;
      itemChanged = true;
    }
    if (paymentMethod && String(next.paymentMethod || next.account || '') !== paymentMethod) {
      next.paymentMethod = paymentMethod;
      next.account = paymentMethod;
      const modality = resolveModality(paymentMethod);
      if (modality) next.modality = modality;
      itemChanged = true;
    }
    if (!itemChanged) return item;
    changed += 1;
    return next;
  });
  return { transactions: nextTransactions, changed };
}
