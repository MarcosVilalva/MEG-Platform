function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

const ISSUER_RULES = [
  { tokens: ["LATAM"], issuer: "LATAM PASS", productName: "LATAM PASS", theme: "latam" },
  { tokens: ["ITAU"], issuer: "Itaú", productName: "Itaú", theme: "itau" },
  { tokens: ["NUBANK"], issuer: "Nubank", productName: "Nubank", theme: "nubank" },
  { tokens: ["SANTANDER"], issuer: "Santander", productName: "Santander", theme: "santander" },
  { tokens: ["BANCO DO BRASIL", "CARTAO BB", " BB"], issuer: "Banco do Brasil", productName: "Ourocard", theme: "bb" },
  { tokens: ["CAIXA"], issuer: "CAIXA", productName: "CAIXA", theme: "caixa" },
  { tokens: ["MERCADO LIVRE", "MERCADO PAGO", "CARTAO ML"], issuer: "Mercado Pago", productName: "Mercado Livre", theme: "mercado" },
  { tokens: ["MAGALU"], issuer: "Magalu", productName: "Cartão Magalu", theme: "magalu" },
  { tokens: ["AZUL"], issuer: "Azul", productName: "Azul", theme: "azul" },
  { tokens: ["BV"], issuer: "Banco BV", productName: "BV Livre", theme: "bv" },
  { tokens: ["RIACHUELO"], issuer: "Riachuelo", productName: "Riachuelo", theme: "riachuelo" },
  { tokens: ["KABUM"], issuer: "KaBuM!", productName: "KaBuM!", theme: "kabum" },
];

const NETWORKS = {
  VISA: { label: "VISA", asset: "assets/card-brands/visa.svg" },
  MASTERCARD: { label: "Mastercard", asset: "assets/card-brands/mastercard.svg" },
  ELO: { label: "Elo", asset: "assets/card-brands/elo.svg" },
  AMEX: { label: "American Express", asset: "assets/card-brands/amex.svg" },
  HIPERCARD: { label: "Hipercard", asset: "assets/card-brands/hipercard.svg" },
  OUTRO: { label: "MEG Card", asset: "assets/card-brands/generic.svg" },
};

function inferredNetwork(text) {
  if (text.includes("MASTERCARD") || text.includes("MASTER")) return "MASTERCARD";
  if (text.includes("VISA")) return "VISA";
  if (text.includes("ELO")) return "ELO";
  if (text.includes("AMEX") || text.includes("AMERICAN EXPRESS")) return "AMEX";
  if (text.includes("HIPERCARD")) return "HIPERCARD";
  return "OUTRO";
}

export function resolveCardIdentity(card = {}) {
  const combined = normalize([card.paymentMethod, card.issuer, card.productName].filter(Boolean).join(" "));
  const rule = ISSUER_RULES.find((candidate) => candidate.tokens.some((token) => combined.includes(token)));
  const explicitBrand = normalize(card.brand);
  const brand = NETWORKS[explicitBrand] ? explicitBrand : inferredNetwork(combined);
  const network = NETWORKS[brand];
  const issuer = String(card.issuer || rule?.issuer || "MEG Finanças").trim();
  const productName = String(card.productName || rule?.productName || card.paymentMethod || "Cartão de crédito").trim();
  const theme = normalize(card.theme) === "AUTO" || !card.theme ? (rule?.theme || brand.toLowerCase()) : normalize(card.theme).toLowerCase();
  const lastFour = String(card.lastFour || "").replace(/\D/g, "").slice(-4);
  return { ...card, brand, issuer, productName, theme, lastFour, networkLabel: network.label, networkAsset: network.asset };
}

function addMonths(month, offset) {
  const [year, monthNumber] = String(month).split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildCardForecast(transactions = [], startMonth, count = 6) {
  const months = Array.from({ length: count }, (_, index) => ({ month: addMonths(startMonth, index), total: 0, count: 0 }));
  const byMonth = new Map(months.map((item) => [item.month, item]));
  transactions.forEach((item) => {
    const modality = normalize(item.modality);
    const payment = normalize(item.paymentMethod || item.account);
    if (item.type !== "expense" || (!modality.includes("CREDITO") && !payment.includes("CARTAO") && !payment.includes("CREDITO"))) return;
    const bucket = byMonth.get(String(item.date || "").slice(0, 7));
    if (!bucket) return;
    bucket.total += Number(item.expenseAmount || item.amount || 0);
    bucket.count += 1;
  });
  return months;
}


